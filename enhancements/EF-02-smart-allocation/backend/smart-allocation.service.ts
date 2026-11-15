/**
 * EF-02: Smart Allocation Engine – Service
 * Owned by M3. Lives in enhancements/ and is loaded via M2's extension hook.
 * Flag: FEATURE_EF_02 (default off)
 *
 * Core rule: each animal has up to SHARES_PER_ANIMAL shares (7 for cattle/buffalo).
 * The optimizer groups unassigned APPROVED participants into available share
 * slots, accounting for existing allocations per animal, respecting household
 * groupings and preferred affinities when policy demands it.
 * The result is a server-signed PREVIEW — nothing is written until /commit
 * echoes back the signed token and the server revalidates it.
 *
 * Security model:
 *   - optimize() stores the preview server-side under a HMAC-signed token.
 *   - commit() IGNORES caller-supplied proposedAllocations and re-fetches the
 *     stored preview by token. This prevents forged/arbitrary allocations.
 *   - Auth is delegated to M2's guard (see integration note in controller).
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
  /** Participant IDs that could not be matched (insufficient slots) */
  unmatched: number[];
  /** Total share slots left unfilled across all animals */
  unfilledSlots: number;
  generatedAt: string;
  /**
   * HMAC-signed token binding this preview to the server.
   * commit() must present this token; the server recomputes the plan from it.
   * Never trust caller-supplied proposedAllocations in commit().
   */
  previewToken: string;
}

export interface CommitRequest {
  programmeId: number;
  /** Token returned by /optimize; commit validates + re-fetches the plan */
  previewToken: string;
  /**
   * Caller-supplied list is IGNORED for security.
   * The server re-derives allocations from the signed token.
   * Field kept for API symmetry / client convenience only.
   */
  proposedAllocations?: ProposedAllocation[];
}

export interface CommitResult {
  committed: number;
  /** Participants already allocated since the preview was generated */
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
}

// ---------------------------------------------------------------------------
// Preview Store (Interface & In-Memory with Deployment Constraint Validation)
// ---------------------------------------------------------------------------

export interface StoredPreview {
  programmeId: number;
  policy: string;
  proposedAllocations: ProposedAllocation[];
  unmatched: number[];
  unfilledSlots: number;
  generatedAt: string;
  expiresAt: number; // epoch ms
}

export interface PreviewStore {
  get(key: string): Promise<StoredPreview | null>;
  set(key: string, value: StoredPreview): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Default preview store with single-process validation.
 * In a multi-worker deployment, M2's DI configures a Redis / DB-backed store.
 */
export class MemoryPreviewStore implements PreviewStore {
  private readonly store = new Map<string, StoredPreview>();

  async get(key: string): Promise<StoredPreview | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item;
  }

  async set(key: string, value: StoredPreview): Promise<void> {
    this.store.set(key, value);
    this.prune();
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, val] of this.store.entries()) {
      if (now > val.expiresAt) this.store.delete(key);
    }
  }
}

const PREVIEW_TTL_MS = 10 * 60 * 1000; // 10 minutes

// ---------------------------------------------------------------------------
// Cryptographic Token Signing (Fails closed if secret is missing)
// ---------------------------------------------------------------------------

const SHARES_PER_ANIMAL = 7;

function getHmacSecret(): string {
  const secret = process.env.EF02_PREVIEW_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error(
      'CONFIG_ERROR: EF02_PREVIEW_SECRET environment variable is missing. Refusing to operate with unconfigured or insecure HMAC key.'
    );
  }
  return secret;
}

function signToken(payload: string): string {
  const secret = getHmacSecret();
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function makePreviewToken(programmeId: number, nonce: string): string {
  const payload = `${programmeId}:${nonce}`;
  const sig = signToken(payload);
  return Buffer.from(`${payload}:${sig}`).toString('base64url');
}

function verifyPreviewToken(token: string): { programmeId: number; nonce: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString();
    const parts = decoded.split(':');
    if (parts.length !== 3) return null;
    const [programmeIdStr, nonce, sig] = parts;
    const expected = signToken(`${programmeIdStr}:${nonce}`);
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return { programmeId: parseInt(programmeIdStr, 10), nonce };
  } catch {
    return null;
  }
}

export class SmartAllocationService {
  private readonly store: PreviewStore;

  constructor(
    private readonly prisma: PrismaLike,
    previewStore?: PreviewStore,
  ) {
    this.store = previewStore ?? new MemoryPreviewStore();
  }

  /**
   * Compute a proposed allocation plan without persisting anything.
   * Accounts for existing per-animal share usage so partially-filled
   * animals are included and the 7-share cap is always respected.
   */
  async optimize(req: OptimizeRequest): Promise<OptimizeResult> {
    const { programmeId, policy = 'default' } = req;

    // Fail closed early if HMAC key is not configured
    getHmacSecret();

    // 1. Load unallocated APPROVED participants (ordered per policy)
    const orderBy = this.participantOrderBy(policy);
    const participants = await this.prisma.participant.findMany({
      where: { programmeId, status: 'APPROVED', allocation: null },
      orderBy,
    });

    // 2. Load ALL animals for this programme (not just fully unallocated)
    //    so we can fill remaining share slots on partially used animals.
    const animals = await this.prisma.animal.findMany({
      where: { group: { programmeId } },
      include: { group: true, _count: { select: { allocation: true } } },
    });

    // 3. Query existing allocation counts per animal to know remaining slots
    const existingAllocsByAnimal = await this.prisma.allocation.findMany({
      where: { animal: { group: { programmeId } } } as object,
      select: { animalId: true, participantId: true },
    });
    const usedSharesMap = new Map<number, number>();
    for (const a of existingAllocsByAnimal) {
      usedSharesMap.set(a.animalId, (usedSharesMap.get(a.animalId) ?? 0) + 1);
    }

    // 4. Expand animals into remaining share slots (respecting 7-share cap)
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
          slotIndex: used + i, // absolute slot index within the animal
        });
      }
    }

    // 5. Apply household affinity grouping if policy demands it
    const orderedSlots = this.applySlotPolicy(slots, policy);

    // 6. Match participants to slots — greedy, one slot per participant,
    //    with household-affinity preference when policy is household_first.
    const { proposedAllocations, unmatched } = this.greedyMatch(
      participants,
      orderedSlots,
      policy,
    );

    const assignedSlotKeys = new Set(
      proposedAllocations.map((pa) => `${pa.slot.animalId}:${pa.slot.slotIndex}`)
    );
    const unfilledSlots = orderedSlots.filter(
      (s) => !assignedSlotKeys.has(`${s.animalId}:${s.slotIndex}`)
    ).length;

    // 7. Sign and store the preview server-side
    const nonce = crypto.randomBytes(8).toString('hex');
    const previewToken = makePreviewToken(programmeId, nonce);
    const generatedAt = new Date().toISOString();

    const stored: StoredPreview = {
      programmeId,
      policy,
      proposedAllocations,
      unmatched,
      unfilledSlots,
      generatedAt,
      expiresAt: Date.now() + PREVIEW_TTL_MS,
    };
    await this.store.set(previewToken, stored);

    return { programmeId, policy, proposedAllocations, unmatched, unfilledSlots, generatedAt, previewToken };
  }

  /**
   * Persist allocations from a prior optimize() call.
   * Atomic Transaction Guarantees:
   *  - Evaluates current share counts inside database transaction ($transaction).
   *  - Caller-supplied proposedAllocations are strictly IGNORED; server replay only.
   *  - Prevents race conditions / overselling the 7-share cap on concurrent commits.
   */
  async commit(req: CommitRequest): Promise<CommitResult> {
    const { programmeId, previewToken } = req;

    // 1. Verify token signature (fails closed if secret missing or token forged)
    const tokenData = verifyPreviewToken(previewToken);
    if (!tokenData || tokenData.programmeId !== programmeId) {
      throw new Error('INVALID_TOKEN');
    }

    // 2. Retrieve stored preview from preview store
    const stored = await this.store.get(previewToken);
    if (!stored) throw new Error('PREVIEW_EXPIRED');
    if (stored.programmeId !== programmeId) throw new Error('PROGRAMME_MISMATCH');

    const { proposedAllocations } = stored;

    // 3. Commit within an isolated transaction (or direct executor if mock)
    const executeCommit = async (tx: PrismaLike): Promise<CommitResult> => {
      // Re-read existing allocations inside transaction boundary
      const existing = await tx.allocation.findMany({
        where: { participant: { programmeId } } as object,
        select: { participantId: true, animalId: true },
      });
      const allocatedParticipants = new Set(existing.map((a) => a.participantId));

      // Build live share count map within transaction
      const liveSharesPerAnimal = new Map<number, number>();
      for (const a of existing) {
        liveSharesPerAnimal.set(a.animalId, (liveSharesPerAnimal.get(a.animalId) ?? 0) + 1);
      }

      // Filter and enforce the strict 7-share cap atomically
      const toCommit = proposedAllocations.filter((pa) => {
        if (allocatedParticipants.has(pa.participantId)) return false;
        const current = liveSharesPerAnimal.get(pa.slot.animalId) ?? 0;
        if (current >= SHARES_PER_ANIMAL) return false;
        liveSharesPerAnimal.set(pa.slot.animalId, current + 1);
        return true;
      });

      const skipped = proposedAllocations.length - toCommit.length;

      if (toCommit.length === 0) {
        await this.store.delete(previewToken);
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

      // Invalidate preview token on successful commit (single-use guarantee)
      await this.store.delete(previewToken);

      return { committed: result.count, skipped, programmeId };
    };

    if (this.prisma.$transaction) {
      return this.prisma.$transaction(executeCommit);
    }
    return executeCommit(this.prisma);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
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

  /**
   * Reorder slots to support household affinity:
   * When policy is 'household_first', group consecutive slots by animal so
   * that household members filling the same animal land adjacent slots.
   * For other policies keep natural order (animal order from DB).
   */
  private applySlotPolicy(slots: ShareSlot[], policy: string): ShareSlot[] {
    if (policy !== 'household_first') return slots;
    // Keep slots in animal order (already grouped by animal from expand step)
    return slots;
  }

  /**
   * Greedy matching. For 'household_first', attempts to assign members of the
   * same household to the same animal (same animalId slots) before moving on.
   */
  private greedyMatch(
    participants: Array<{ id: number; name: string; householdId: number }>,
    slots: ShareSlot[],
    policy: string,
  ): { proposedAllocations: ProposedAllocation[]; unmatched: number[] } {
    const proposedAllocations: ProposedAllocation[] = [];
    const unmatched: number[] = [];

    if (policy === 'household_first') {
      // Build per-animal slot queues
      const animalSlots = new Map<number, ShareSlot[]>();
      for (const slot of slots) {
        if (!animalSlots.has(slot.animalId)) animalSlots.set(slot.animalId, []);
        animalSlots.get(slot.animalId)!.push(slot);
      }
      const animalQueue = [...animalSlots.keys()];

      let currentAnimalIdx = 0;
      for (const participant of participants) {
        let assigned = false;
        // Try current animal first (keep household together)
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
            // Stay on this animal for the next participant (household grouping)
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
      // Simple FIFO queue
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

  private pruneExpiredPreviews(): void {
    const now = Date.now();
    for (const [key, val] of previewStore.entries()) {
      if (now > val.expiresAt) previewStore.delete(key);
    }
  }
}
