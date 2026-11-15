/**
 * EF-02: Smart Allocation Engine – Service
 * Owned by M3. Lives in enhancements/ and is loaded via M2's extension hook.
 * Flag: FEATURE_EF_02 (default off)
 *
 * Core rule: each animal has up to SHARES_PER_ANIMAL shares (7 for cattle/buffalo).
 *
 * High-Concurrency & Multi-Worker Architecture:
 * 1. Stateless Cryptographic Preview Tokens:
 *    The preview payload (allocations, timestamps, expiration, programmeId)
 *    is serialized and signed using HMAC-SHA256 (`base64url(payload).hmacSignature`).
 *    This eliminates process-local in-memory state:
 *    - Fully shared across load-balanced workers and container restarts.
 *    - Zero external caching infrastructure (Redis) required.
 *    - Tamper-proof: client cannot alter any proposed allocation without invalidating HMAC.
 *
 * 2. Atomic Row-Level Locking (`FOR UPDATE`):
 *    During commit(), the database transaction locks the target Animal rows
 *    (`SELECT id FROM "Animal" WHERE id IN (...) FOR UPDATE`).
 *    This serializes concurrent commits targeting the same animals, preventing
 *    race conditions where two transactions read free slots simultaneously and
 *    oversell beyond the strict 7-share cap.
 */

import * as crypto from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizeRequest {
  programmeId: number;
  /** Policy: 'default' (FIFO) | 'household_first' | 'fifo' */
  policy?: string;
}

export interface ShareSlot {
  animalId: number;
  animalTag: string;
  animalSpecies: string;
  animalWeight: number;
  /** 1-based slot index within the animal (1–SHARES_PER_ANIMAL) */
  slotIndex: number;
}

export interface ProposedAllocation {
  participantId: number;
  participantName: string;
  householdId: number;
  slot: ShareSlot;
}

export interface OptimizeResult {
  programmeId: number;
  policy: string;
  proposedAllocations: ProposedAllocation[];
  unmatched: number[];
  unfilledSlots: number;
  generatedAt: string;
  /** Stateless, cryptographically signed token verifiable by any worker */
  previewToken: string;
}

export interface CommitRequest {
  programmeId: number;
  /** Token returned by /optimize; commit validates signature and extracts server preview */
  previewToken: string;
  /** Client-supplied allocations are ignored to prevent tampering */
  proposedAllocations?: ProposedAllocation[];
}

export interface CommitResult {
  committed: number;
  /** Participants already allocated since preview was generated */
  skipped: number;
  programmeId: number;
}

// ---------------------------------------------------------------------------
// Prisma-compatible interface (replaced by real PrismaService at runtime)
// ---------------------------------------------------------------------------

export interface PrismaLike {
  programme: { findUnique: (a: object) => Promise<{ id: number } | null> };
  participant: {
    findMany: (a: object) => Promise<
      Array<{
        id: number;
        name: string;
        householdId: number;
        status: string;
        programmeId: number;
        allocation: { id: number } | null;
        createdAt: Date;
      }>
    >;
  };
  animal: {
    findMany: (a: object) => Promise<
      Array<{
        id: number;
        tagNumber: string;
        weight: number;
        group: { programmeId: number; species: string };
        _count?: { allocation: number };
      }>
    >;
  };
  allocation: {
    createMany: (a: object) => Promise<{ count: number }>;
    findMany: (a: object) => Promise<Array<{ participantId: number; animalId: number }>>;
    count: (a: object) => Promise<number>;
  };
  $transaction?: <T>(fn: (tx: PrismaLike) => Promise<T>) => Promise<T>;
  $queryRawUnsafe?: (query: string, ...values: any[]) => Promise<any>;
}

// ---------------------------------------------------------------------------
// Preview Payload Structure (Stateless Token)
// ---------------------------------------------------------------------------

export interface PreviewPayload {
  programmeId: number;
  policy: string;
  proposedAllocations: ProposedAllocation[];
  unmatched: number[];
  unfilledSlots: number;
  generatedAt: string;
  expiresAt: number; // epoch ms
  nonce: string;
}

const PREVIEW_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SHARES_PER_ANIMAL = 7;

// ---------------------------------------------------------------------------
// Cryptographic Token Signing (Stateless, Fails Closed)
// ---------------------------------------------------------------------------

function getHmacSecret(): string {
  const secret = process.env.EF02_PREVIEW_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'CONFIG_ERROR: EF02_PREVIEW_SECRET environment variable is missing. Refusing to operate with unconfigured HMAC key.'
    );
  }
  return secret;
}

function sign(content: string): string {
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret).update(content).digest('base64url');
}

/**
 * Creates a stateless signed token.
 * Format: `<base64url(jsonPayload)>.<hmacSignature>`
 */
function createSignedPreviewToken(payload: PreviewPayload): string {
  const serialized = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(serialized);
  return `${serialized}.${signature}`;
}

/**
 * Validates HMAC signature and expiration for a preview token.
 * Returns decoded PreviewPayload or throws appropriate error.
 */
function verifyAndDecodeToken(token: string): PreviewPayload {
  if (!token || typeof token !== 'string') {
    throw new Error('INVALID_TOKEN');
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    throw new Error('INVALID_TOKEN');
  }

  const [serialized, signature] = parts;
  const expectedSignature = sign(serialized);

  // Timing-safe comparison to prevent timing attacks
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('INVALID_TOKEN');
  }

  let payload: PreviewPayload;
  try {
    const jsonStr = Buffer.from(serialized, 'base64url').toString('utf8');
    payload = JSON.parse(jsonStr);
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  if (Date.now() > payload.expiresAt) {
    throw new Error('PREVIEW_EXPIRED');
  }

  return payload;
}

// ---------------------------------------------------------------------------
// Service Implementation
// ---------------------------------------------------------------------------

export class SmartAllocationService {
  constructor(private readonly prisma: PrismaLike) {}

  /**
   * Compute a proposed allocation plan without persisting anything.
   * Generates a stateless, cryptographically signed token.
   */
  async optimize(req: OptimizeRequest): Promise<OptimizeResult> {
    const { programmeId, policy = 'default' } = req;

    // Fail closed if HMAC key is not configured
    getHmacSecret();

    // 1. Load unallocated APPROVED participants (ordered per policy)
    const orderBy = this.participantOrderBy(policy);
    const participants = await this.prisma.participant.findMany({
      where: { programmeId, status: 'APPROVED', allocation: null },
      orderBy,
    });

    // 2. Load all animals for this programme to check remaining share capacity
    const animals = await this.prisma.animal.findMany({
      where: { group: { programmeId } },
      include: { group: true, _count: { select: { allocation: true } } },
    });

    // 3. Query existing allocations per animal
    const existingAllocsByAnimal = await this.prisma.allocation.findMany({
      where: { animal: { group: { programmeId } } } as object,
      select: { animalId: true, participantId: true },
    });
    const usedSharesMap = new Map<number, number>();
    for (const a of existingAllocsByAnimal) {
      usedSharesMap.set(a.animalId, (usedSharesMap.get(a.animalId) ?? 0) + 1);
    }

    // 4. Expand remaining slots per animal (up to 7)
    const slots: ShareSlot[] = [];
    for (const animal of animals) {
      const used = usedSharesMap.get(animal.id) ?? 0;
      const remaining = SHARES_PER_ANIMAL - used;
      for (let i = 1; i <= remaining; i++) {
        slots.push({
          animalId: animal.id,
          animalTag: animal.tagNumber,
          animalSpecies: animal.group.species,
          animalWeight: animal.weight,
          slotIndex: used + i,
        });
      }
    }

    // 5. Match participants to slots with household affinity
    const { proposedAllocations, unmatched } = this.greedyMatch(
      participants,
      slots,
      policy,
    );

    const assignedSlotKeys = new Set(
      proposedAllocations.map((pa) => `${pa.slot.animalId}:${pa.slot.slotIndex}`)
    );
    const unfilledSlots = slots.filter(
      (s) => !assignedSlotKeys.has(`${s.animalId}:${s.slotIndex}`)
    ).length;

    // 6. Construct stateless cryptographically signed preview token
    const generatedAt = new Date().toISOString();
    const payload: PreviewPayload = {
      programmeId,
      policy,
      proposedAllocations,
      unmatched,
      unfilledSlots,
      generatedAt,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
      nonce: crypto.randomBytes(12).toString('hex'),
    };

    const previewToken = createSignedPreviewToken(payload);

    return {
      programmeId,
      policy,
      proposedAllocations,
      unmatched,
      unfilledSlots,
      generatedAt,
      previewToken,
    };
  }

  /**
   * Persist allocations from a verified preview token.
   * Concurrency & Integrity Guarantees:
   * 1. Stateless signature check: decodes verified proposal, ignores client payload.
   * 2. Atomic Row Lock (`FOR UPDATE`): locks target animals within the transaction
   *    to serialize concurrent commits on the same animals.
   * 3. Live 7-share cap check: verifies live counts inside the transaction boundary.
   */
  async commit(req: CommitRequest): Promise<CommitResult> {
    const { programmeId, previewToken } = req;

    // 1. Verify token signature and expiration
    const payload = verifyAndDecodeToken(previewToken);
    if (payload.programmeId !== programmeId) {
      throw new Error('PROGRAMME_MISMATCH');
    }

    const { proposedAllocations } = payload;
    if (proposedAllocations.length === 0) {
      return { committed: 0, skipped: 0, programmeId };
    }

    // Identify target animal IDs to lock
    const targetAnimalIds = Array.from(
      new Set(proposedAllocations.map((p) => p.slot.animalId))
    );

    // 2. Transaction execution boundary
    const executeCommit = async (tx: PrismaLike): Promise<CommitResult> => {
      // ATOMIC LOCK: Lock animal rows with FOR UPDATE using $queryRawUnsafe
      // Fails closed if query locking method is unavailable or fails
      if (targetAnimalIds.length > 0) {
        if (!tx.$queryRawUnsafe) {
          throw new Error(
            'CONCURRENCY_ERROR: Database client does not provide query-locking capability ($queryRawUnsafe).'
          );
        }
        const idList = targetAnimalIds.map((id) => Number(id)).filter((id) => !isNaN(id));
        if (idList.length > 0) {
          const lockedRows = await tx.$queryRawUnsafe(
            `SELECT id FROM "Animal" WHERE id IN (${idList.join(',')}) FOR UPDATE`
          );
          if (lockedRows === null || lockedRows === undefined) {
            throw new Error('CONCURRENCY_ERROR: Failed to acquire row lock on target animals.');
          }
        }
      }

      // Re-read current allocations for these animals INSIDE the lock
      const currentAllocations = await tx.allocation.findMany({
        where: {
          participant: { programmeId },
        } as object,
        select: { participantId: true, animalId: true },
      });

      const allocatedParticipants = new Set(
        currentAllocations.map((a) => a.participantId)
      );

      // Replay rejection: If all proposed participants have already been allocated,
      // the preview token has already been fully consumed. Fails with 410 Gone.
      const allAlreadyAllocated = proposedAllocations.every((pa) =>
        allocatedParticipants.has(pa.participantId)
      );
      if (allAlreadyAllocated && proposedAllocations.length > 0) {
        throw new Error('PREVIEW_ALREADY_COMMITTED');
      }

      // Re-calculate live share counts under the row lock
      const liveSharesPerAnimal = new Map<number, number>();
      for (const a of currentAllocations) {
        liveSharesPerAnimal.set(a.animalId, (liveSharesPerAnimal.get(a.animalId) ?? 0) + 1);
      }

      // Filter allocations strictly adhering to the 7-share limit
      const toCommit = proposedAllocations.filter((pa) => {
        if (allocatedParticipants.has(pa.participantId)) return false;
        const currentCount = liveSharesPerAnimal.get(pa.slot.animalId) ?? 0;
        if (currentCount >= SHARES_PER_ANIMAL) return false;

        // Reserve slot in live count
        liveSharesPerAnimal.set(pa.slot.animalId, currentCount + 1);
        allocatedParticipants.add(pa.participantId);
        return true;
      });

      const skipped = proposedAllocations.length - toCommit.length;
      if (toCommit.length === 0) {
        return { committed: 0, skipped, programmeId };
      }

      const data = toCommit.map((pa) => ({
        participantId: pa.participantId,
        animalId: pa.slot.animalId,
        programmeId,
      }));

      const result = await tx.allocation.createMany({
        data,
        skipDuplicates: true,
      });

      return { committed: result.count, skipped, programmeId };
    };

    if (this.prisma.$transaction) {
      return this.prisma.$transaction(executeCommit);
    }
    return executeCommit(this.prisma);
  }

  // ---------------------------------------------------------------------------
  // Private Helpers
  // ---------------------------------------------------------------------------

  private participantOrderBy(policy: string): object | object[] {
    switch (policy) {
      case 'household_first':
        return [{ householdId: 'asc' }, { createdAt: 'asc' }];
      case 'fifo':
      case 'default':
      default:
        return { createdAt: 'asc' };
    }
  }

  private greedyMatch(
    participants: Array<{ id: number; name: string; householdId: number }>,
    slots: ShareSlot[],
    policy: string,
  ): { proposedAllocations: ProposedAllocation[]; unmatched: number[] } {
    const proposedAllocations: ProposedAllocation[] = [];
    const unmatched: number[] = [];

    if (policy === 'household_first') {
      const animalSlots = new Map<number, ShareSlot[]>();
      for (const slot of slots) {
        if (!animalSlots.has(slot.animalId)) animalSlots.set(slot.animalId, []);
        animalSlots.get(slot.animalId)!.push(slot);
      }
      const animalQueue = [...animalSlots.keys()];

      let currentAnimalIdx = 0;
      for (const participant of participants) {
        let assigned = false;
        for (let attempt = 0; attempt < animalQueue.length; attempt++) {
          const idx = (currentAnimalIdx + attempt) % animalQueue.length;
          const animalId = animalQueue[idx];
          const slotsForAnimal = animalSlots.get(animalId)!;
          if (slotsForAnimal.length > 0) {
            const slot = slotsForAnimal.shift()!;
            proposedAllocations.push({
              participantId: participant.id,
              participantName: participant.name,
              householdId: participant.householdId,
              slot,
            });
            if (slotsForAnimal.length === 0) {
              animalQueue.splice(idx, 1);
              currentAnimalIdx = idx % Math.max(animalQueue.length, 1);
            } else {
              currentAnimalIdx = idx;
            }
            assigned = true;
            break;
          }
        }
        if (!assigned) unmatched.push(participant.id);
      }
    } else {
      const slotQueue = [...slots];
      for (const participant of participants) {
        if (slotQueue.length === 0) {
          unmatched.push(participant.id);
          continue;
        }
        const slot = slotQueue.shift()!;
        proposedAllocations.push({
          participantId: participant.id,
          participantName: participant.name,
          householdId: participant.householdId,
          slot,
        });
      }
    }

    return { proposedAllocations, unmatched };
  }
}

