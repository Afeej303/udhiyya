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
}

// ---------------------------------------------------------------------------
// In-memory preview store (replace with Redis / DB in production)
// ---------------------------------------------------------------------------

interface StoredPreview {
  programmeId: number;
  policy: string;
  proposedAllocations: ProposedAllocation[];
  unmatched: number[];
  unfilledSlots: number;
  generatedAt: string;
  expiresAt: number; // epoch ms
}

const PREVIEW_TTL_MS = 10 * 60 * 1000; // 10 minutes
const previewStore = new Map<string, StoredPreview>();

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const SHARES_PER_ANIMAL = 7;
const HMAC_SECRET = process.env.EF02_PREVIEW_SECRET ?? 'ef02-dev-secret-change-in-prod';

function signToken(payload: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(payload).digest('hex');
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
  constructor(private readonly prisma: PrismaLike) {}

  /**
   * Compute a proposed allocation plan without persisting anything.
   * Accounts for existing per-animal share usage so partially-filled
   * animals are included and the 7-share cap is always respected.
   */
  async optimize(req: OptimizeRequest): Promise<OptimizeResult> {
    const { programmeId, policy = 'default' } = req;

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
    previewStore.set(previewToken, stored);

    // Prune stale previews
    this.pruneExpiredPreviews();

    return { programmeId, policy, proposedAllocations, unmatched, unfilledSlots, generatedAt, previewToken };
  }

  /**
   * Persist allocations from a prior optimize() call.
   * SECURITY: caller-supplied proposedAllocations are IGNORED.
   * The server re-fetches the signed preview by token.
   * Idempotent: skips participants already allocated since preview.
   */
  async commit(req: CommitRequest): Promise<CommitResult> {
    const { programmeId, previewToken } = req;

    // 1. Verify token signature
    const tokenData = verifyPreviewToken(previewToken);
    if (!tokenData || tokenData.programmeId !== programmeId) {
      throw new Error('INVALID_TOKEN');
    }

    // 2. Retrieve stored preview
    const stored = previewStore.get(previewToken);
    if (!stored) throw new Error('PREVIEW_EXPIRED');
    if (Date.now() > stored.expiresAt) {
      previewStore.delete(previewToken);
      throw new Error('PREVIEW_EXPIRED');
    }
    if (stored.programmeId !== programmeId) throw new Error('PROGRAMME_MISMATCH');

    const { proposedAllocations } = stored;

    // 3. Find participants already allocated since preview
    const existing = await this.prisma.allocation.findMany({
      where: { participant: { programmeId } } as object,
      select: { participantId: true, animalId: true },
    });
    const allocatedParticipants = new Set(existing.map((a) => a.participantId));

    // 4. Validate 7-share cap per animal (concurrent-commit safety)
    const sharesPerAnimal = new Map<number, number>();
    for (const a of existing) {
      sharesPerAnimal.set(a.animalId, (sharesPerAnimal.get(a.animalId) ?? 0) + 1);
    }

    const toCommit = proposedAllocations.filter((pa) => {
      if (allocatedParticipants.has(pa.participantId)) return false;
      const current = sharesPerAnimal.get(pa.slot.animalId) ?? 0;
      if (current >= SHARES_PER_ANIMAL) return false;
      // Optimistically increment so concurrent entries in this batch respect cap
      sharesPerAnimal.set(pa.slot.animalId, current + 1);
      return true;
    });

    const skipped = proposedAllocations.length - toCommit.length;

    if (toCommit.length === 0) {
      previewStore.delete(previewToken);
      return { committed: 0, skipped, programmeId };
    }

    const data = toCommit.map((pa) => ({
      participantId: pa.participantId,
      animalId: pa.slot.animalId,
      programmeId,
    }));

    const result = await this.prisma.allocation.createMany({
      data,
      skipDuplicates: true,
    });

    // Invalidate preview after commit (one-use token)
    previewStore.delete(previewToken);

    return { committed: result.count, skipped, programmeId };
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
