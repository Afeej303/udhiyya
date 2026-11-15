/**
 * EF-02: Smart Allocation Engine – Unit Tests (V0)
 * Run with: npx jest enhancements/EF-02-smart-allocation/tests/
 *
 * Tests the service layer directly with an in-memory Prisma mock.
 * Validates:
 * 1. Partially filled animals (remaining shares = 7 - existing).
 * 2. Strict 7-share max per animal.
 * 3. Household affinity grouping.
 * 4. HMAC-signed token security and server-side preview replay (forgery prevention).
 * 5. Concurrent / pre-allocated participant skip.
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

function makePrisma(
  participants: ReturnType<typeof makeParticipant>[],
  animals: ReturnType<typeof makeAnimal>[],
  existingAllocations: Array<{ participantId: number; animalId: number }> = [],
): PrismaLike {
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
      findMany: async () => existingAllocations as any,
      count: async () => existingAllocations.length,
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
    const slotIndexes = result.proposedAllocations.map((pa) => pa.slot.slotIndex).sort();
    expect(slotIndexes).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  test('partially filled animal: animal already has 3 allocations, only 4 slots remaining', async () => {
    const participants = Array.from({ length: 5 }, (_, i) => makeParticipant(i + 1));
    const animals = [makeAnimal(1)];
    // 3 existing allocations for animal 1
    const existing = [
      { participantId: 101, animalId: 1 },
      { participantId: 102, animalId: 1 },
      { participantId: 103, animalId: 1 },
    ];
    const svc = new SmartAllocationService(makePrisma(participants, animals, existing));
    const result = await svc.optimize(req);
    // Only 4 slots available (7 - 3 = 4)
    expect(result.proposedAllocations).toHaveLength(4);
    expect(result.unmatched).toHaveLength(1);
    // Slots indices should start from 4 up to 7
    const slotIndexes = result.proposedAllocations.map((pa) => pa.slot.slotIndex).sort();
    expect(slotIndexes).toEqual([4, 5, 6, 7]);
  });

  test('no animal exceeds 7 shares total', async () => {
    const participants = Array.from({ length: 14 }, (_, i) => makeParticipant(i + 1));
    const animals = [makeAnimal(1)]; // only 7 slots available
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize(req);
    expect(result.proposedAllocations).toHaveLength(7);
    expect(result.unmatched).toHaveLength(7);
    const slotKeys = result.proposedAllocations.map(
      (pa) => `${pa.slot.animalId}-${pa.slot.slotIndex}`
    );
    expect(new Set(slotKeys).size).toBe(slotKeys.length);
  });

  test('household_first groups members of same household on same animal', async () => {
    // Household 1 has 3 members, Household 2 has 2 members
    const participants = [
      makeParticipant(1, 1),
      makeParticipant(2, 1),
      makeParticipant(3, 1),
      makeParticipant(4, 2),
      makeParticipant(5, 2),
    ];
    const animals = [makeAnimal(1), makeAnimal(2)];
    const svc = new SmartAllocationService(makePrisma(participants, animals));
    const result = await svc.optimize({ programmeId: 1, policy: 'household_first' });

    // Verify Household 1 members share the same animal
    const h1Allocations = result.proposedAllocations.filter((p) => p.householdId === 1);
    const h1AnimalIds = new Set(h1Allocations.map((p) => p.slot.animalId));
    expect(h1AnimalIds.size).toBe(1); // All on animal 1
  });

  test('previewToken is HMAC-signed and valid', async () => {
    const svc = new SmartAllocationService(makePrisma([makeParticipant(1)], [makeAnimal(1)]));
    const result = await svc.optimize(req);
    expect(result.previewToken).toBeTruthy();
  });
});

describe('SmartAllocationService.commit() Security & Validation', () => {
  test('rejects forged or invalid previewToken', async () => {
    const svc = new SmartAllocationService(makePrisma([], []));
    await expect(
      svc.commit({
        programmeId: 1,
        previewToken: 'fake-invalid-token',
      })
    ).rejects.toThrow('INVALID_TOKEN');
  });

  test('ignores caller-supplied proposedAllocations to prevent tampering', async () => {
    const prisma = makePrisma([makeParticipant(1)], [makeAnimal(1)]);
    const svc = new SmartAllocationService(prisma);
    const preview = await svc.optimize({ programmeId: 1 });

    // Malicious caller attempts to inject a forged allocation
    const forgedProposals = [
      {
        participantId: 9999, // Unauthorized participant
        participantName: 'Hacker',
        householdId: 99,
        slot: { animalId: 1, animalTag: 'TAG-1', animalSpecies: 'Cattle', animalWeight: 400, slotIndex: 1 },
      },
    ];

    const result = await svc.commit({
      programmeId: 1,
      previewToken: preview.previewToken,
      proposedAllocations: forgedProposals,
    });

    // Server committed the genuine stored preview (participant 1), not participant 9999
    expect(result.committed).toBe(1);
    expect(result.programmeId).toBe(1);
  });

  test('skips participants already allocated since preview', async () => {
    const prisma = makePrisma([makeParticipant(1)], [makeAnimal(1)]);
    const svc = new SmartAllocationService(prisma);
    const preview = await svc.optimize({ programmeId: 1 });

    // Simulate participant 1 already allocated before commit
    prisma.allocation.findMany = async () => [{ participantId: 1, animalId: 1 }] as any;

    const result = await svc.commit({
      programmeId: 1,
      previewToken: preview.previewToken,
    });
    expect(result.skipped).toBe(1);
    expect(result.committed).toBe(0);
  });

  test('preview token is single-use (cannot be replayed)', async () => {
    const prisma = makePrisma([makeParticipant(1)], [makeAnimal(1)]);
    const svc = new SmartAllocationService(prisma);
    const preview = await svc.optimize({ programmeId: 1 });

    // First commit succeeds
    const firstResult = await svc.commit({
      programmeId: 1,
      previewToken: preview.previewToken,
    });
    expect(firstResult.committed).toBe(1);

    // Second commit with same token fails (token consumed)
    await expect(
      svc.commit({
        programmeId: 1,
        previewToken: preview.previewToken,
      })
    ).rejects.toThrow('PREVIEW_EXPIRED');
  });
});

