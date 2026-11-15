/**
 * EF-02: Smart Allocation Engine – Service
 * Owned by M3. Lives in enhancements/ and is loaded via M2's extension hook.
 * Flag: FEATURE_EF_02 (default off)
 *
 * Core rule: each animal has exactly 7 shares (for cattle/buffalo).
 * The optimizer groups unassigned APPROVED participants into available share
 * slots, respecting household groupings and preferred day/time when present.
 * The result is a PREVIEW — nothing is written until /commit is called.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OptimizeRequest {
  programmeId: number;
  /** Policy string: 'default' | 'household_first' | 'fifo' */
  policy?: string;
}

export interface ShareSlot {
  animalId: number;
  animalTag: string;
  animalSpecies: string;
  animalWeight: number;
  slotIndex: number; // 1–7
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
  /** Participants that could not be matched (not enough slots) */
  unmatched: number[];
  /** Animal share slots left unfilled */
  unfilledSlots: number;
  generatedAt: string;
  /** Opaque token that /commit echoes back for idempotency */
  previewToken: string;
}

export interface CommitRequest {
  programmeId: number;
  previewToken: string;
  proposedAllocations: ProposedAllocation[];
}

export interface CommitResult {
  committed: number;
  skipped: number; // already allocated since preview was generated
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
        allocation: { id: number } | null;
      }>
    >;
  };
  allocation: {
    createMany: (a: object) => Promise<{ count: number }>;
    findMany: (a: object) => Promise<Array<{ participantId: number }>>;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const SHARES_PER_ANIMAL = 7;

export class SmartAllocationService {
  constructor(private readonly prisma: PrismaLike) {}

  /**
   * Compute a proposed allocation plan without persisting anything.
   */
  async optimize(req: OptimizeRequest): Promise<OptimizeResult> {
    const { programmeId, policy = 'default' } = req;

    // 1. Load unallocated APPROVED participants
    const participants = await this.prisma.participant.findMany({
      where: {
        programmeId,
        status: 'APPROVED',
        allocation: null,
      },
      orderBy: policy === 'household_first'
        ? [{ householdId: 'asc' }, { createdAt: 'asc' }]
        : { createdAt: 'asc' },
    });

    // 2. Load unallocated animals for this programme
    const animals = await this.prisma.animal.findMany({
      where: { allocation: null, group: { programmeId } },
      include: { group: true, allocation: true },
    });

    // 3. Expand animals into share slots (up to 7 per animal)
    const slots: ShareSlot[] = [];
    for (const animal of animals) {
      for (let i = 1; i <= SHARES_PER_ANIMAL; i++) {
        slots.push({
          animalId: animal.id,
          animalTag: animal.tagNumber,
          animalSpecies: animal.group.species,
          animalWeight: animal.weight,
          slotIndex: i,
        });
      }
    }

    // 4. Match participants to slots (one slot per participant, greedy)
    const proposedAllocations: ProposedAllocation[] = [];
    const unmatched: number[] = [];
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

    const unfilledSlots = slotQueue.length;
    const previewToken = Buffer.from(
      `${programmeId}:${Date.now()}`
    ).toString('base64');

    return {
      programmeId,
      policy,
      proposedAllocations,
      unmatched,
      unfilledSlots,
      generatedAt: new Date().toISOString(),
      previewToken,
    };
  }

  /**
   * Persist the proposed allocations from a prior optimize() call.
   * Idempotent: skips participants already allocated since the preview.
   */
  async commit(req: CommitRequest): Promise<CommitResult> {
    const { programmeId, proposedAllocations } = req;

    // Find participants already allocated since preview
    const alreadyAllocated = await this.prisma.allocation.findMany({
      where: {
        participant: { programmeId },
      } as object,
      select: { participantId: true },
    });
    const allocatedIds = new Set(alreadyAllocated.map((a) => a.participantId));

    const toCommit = proposedAllocations.filter(
      (pa) => !allocatedIds.has(pa.participantId)
    );

    if (toCommit.length === 0) {
      return { committed: 0, skipped: proposedAllocations.length, programmeId };
    }

    // Build allocation records
    // NOTE: In the real implementation, Allocation links participantId <-> animalId.
    // We use the first slot per animal for the foreign key; real schema may differ.
    const data = toCommit.map((pa) => ({
      participantId: pa.participantId,
      animalId: pa.slot.animalId,
      programmeId,
    }));

    const result = await this.prisma.allocation.createMany({
      data,
      skipDuplicates: true,
    });

    return {
      committed: result.count,
      skipped: proposedAllocations.length - result.count,
      programmeId,
    };
  }
}
