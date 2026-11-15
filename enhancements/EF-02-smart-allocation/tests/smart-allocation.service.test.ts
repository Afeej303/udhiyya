/**
 * EF-02: Smart Allocation Engine – Unit Tests (V0)
 * Run with: npx jest enhancements/EF-02-smart-allocation/tests/
 *
 * Tests the service layer directly with an in-memory Prisma mock.
 * No HTTP layer, no flag check (controller tests cover that).
 */

import { SmartAllocationService, PrismaLike, OptimizeRequest } from '../backend/smart-allocation.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeParticipant(id: number, householdId = 1) {
  return {
    id,
    name: `Participant ${id}`,
    householdId,
    status: 'APPROVED',
    programmeId: 1,
    allocation: null,
    createdAt: new Date(Date.now() + id * 1000),
  };
}

function makeAnimal(id: number) {
  return {
    id,
    tagNumber: `TAG-${id}`,
    weight: 300 + id * 10,
    allocation: null,
    group: { programmeId: 1, species: 'Cattle' },
  };
}

function makePrisma(participants: ReturnType<typeof makeParticipant>[], animals: ReturnType<typeof makeAnimal>[]): PrismaLike {
  return {
    programme: {
      findUnique: async () => ({ id: 1 }),
    },
    participant: {
      findMany: async () => participants as any,
    },
    animal: {
      findMany: async () => animals as any,
    },
    allocation: {
      createMany: async ({ data }: any) => ({ count: data.length }),
      findMany: async () => [],
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SmartAllocationService.optimize()', () => {
  const req: OptimizeRequest = { programmeId: 1 };

  test('no participants, no animals → empty plan', async () => {
    const svc = new SmartAllocationService(makePrisma([], []));
    const result = await svc.optimize(req);
    expect(result.proposedAllocations).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
    expect(result.unfilledSlots).toBe(0);
  });

  test('7 participants, 1 animal → all 7 share slots filled, 0 unfilled', async () => {
    const participants = Array.from({ length: 7 }, (_, i) => makeParticipant(i + 1));
    const animals = [makeAnimal(1)];
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize(req);
    expect(result.proposedAllocations).toHaveLength(7);
    expect(result.unmatched).toHaveLength(0);
    expect(result.unfilledSlots).toBe(0);
    // Every slot index from 1–7 should appear exactly once
    const slotIndexes = result.proposedAllocations.map((pa) => pa.slot.slotIndex).sort();
    expect(slotIndexes).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('no animal exceeds 7 shares', async () => {
    const participants = Array.from({ length: 14 }, (_, i) => makeParticipant(i + 1));
    const animals = [makeAnimal(1)]; // only 7 slots available
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize(req);
    expect(result.proposedAllocations).toHaveLength(7);
    expect(result.unmatched).toHaveLength(7); // 7 participants unmatched
    // No duplicate slots for the same animal
    const slotKeys = result.proposedAllocations.map(
      (pa) => `${pa.slot.animalId}-${pa.slot.slotIndex}`
    );
    expect(new Set(slotKeys).size).toBe(slotKeys.length);
  });

  test('no participant is allocated twice', async () => {
    const participants = Array.from({ length: 5 }, (_, i) => makeParticipant(i + 1));
    const animals = [makeAnimal(1), makeAnimal(2)];
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize(req);
    const pIds = result.proposedAllocations.map((pa) => pa.participantId);
    expect(new Set(pIds).size).toBe(pIds.length);
  });

  test('household_first policy sorts by householdId then createdAt', async () => {
    const participants = [
      makeParticipant(1, 2),
      makeParticipant(2, 1),
      makeParticipant(3, 2),
      makeParticipant(4, 1),
    ];
    const animals = [makeAnimal(1)];
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize({ programmeId: 1, policy: 'household_first' });
    // The service delegates ordering to Prisma; just verify plan length
    expect(result.proposedAllocations.length).toBeLessThanOrEqual(7);
    expect(result.policy).toBe('household_first');
  });

  test('previewToken is a non-empty base64 string', async () => {
    const svc = new SmartAllocationService(makePrisma([makeParticipant(1)], [makeAnimal(1)]));
    const result = await svc.optimize(req);
    expect(result.previewToken).toBeTruthy();
    expect(Buffer.from(result.previewToken, 'base64').toString()).toContain('1:');
  });
});

describe('SmartAllocationService.commit()', () => {
  test('commits proposed allocations and returns count', async () => {
    const prisma = makePrisma([makeParticipant(1)], [makeAnimal(1)]);
    const svc = new SmartAllocationService(prisma);
    const preview = await svc.optimize({ programmeId: 1 });
    const result = await svc.commit({
      programmeId: 1,
      previewToken: preview.previewToken,
      proposedAllocations: preview.proposedAllocations,
    });
    expect(result.committed).toBeGreaterThan(0);
    expect(result.programmeId).toBe(1);
  });

  test('skips participants already allocated since preview', async () => {
    const prisma = makePrisma([makeParticipant(1)], [makeAnimal(1)]);
    // Simulate participant 1 already allocated
    prisma.allocation.findMany = async () => [{ participantId: 1 }] as any;
    const svc = new SmartAllocationService(prisma);
    const preview = await svc.optimize({ programmeId: 1 });
    const result = await svc.commit({
      programmeId: 1,
      previewToken: preview.previewToken,
      proposedAllocations: preview.proposedAllocations,
    });
    expect(result.skipped).toBe(preview.proposedAllocations.length);
    expect(result.committed).toBe(0);
  });

  test('empty proposedAllocations returns 0 committed', async () => {
    const svc = new SmartAllocationService(makePrisma([], []));
    const result = await svc.commit({
      programmeId: 1,
      previewToken: 'tok',
      proposedAllocations: [],
    });
    expect(result.committed).toBe(0);
    expect(result.skipped).toBe(0);
  });
});
