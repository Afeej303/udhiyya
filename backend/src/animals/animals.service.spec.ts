import { expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationService } from '../registration/registration.service.js';
import { AnimalsService } from './animals.service.js';

it('checks shared animal capacity across groups before allocating and audits a successful write', async () => {
  const createAllocation = vi
    .fn()
    .mockResolvedValue({ id: 'share-1', shares: 2 });
  const audit = vi.fn().mockResolvedValue({});
  const aggregate = vi
    .fn()
    .mockResolvedValueOnce({ _sum: { shares: 6 } })
    .mockResolvedValueOnce({ _sum: { shares: 5 } });

  const tx = {
    registration: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: 'registration-1',
          status: 'approved',
          shares: 2,
        }),
    },
    animalGroup: {
      findFirst: vi
        .fn()
        .mockResolvedValue({
          id: 'group-1',
          animalId: 'animal-1',
          animal: { shareCapacity: 7 },
        }),
    },
    shareAllocation: { aggregate, create: createAllocation },
    auditLog: { create: audit },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  const registrations = {
    getProgramme: vi.fn().mockResolvedValue({ id: 'programme-1' }),
  };
  const animals = new AnimalsService(
    prisma as unknown as PrismaService,
    registrations as unknown as RegistrationService,
  );
  const scope = { organizationId: 'org-1', programmeId: 'programme-1' };
  const payload = {
    registrationId: 'registration-1',
    groupId: 'group-1',
    shares: 2,
  };

  await expect(animals.allocate(scope, 'actor-1', payload)).rejects.toThrow(
    'Animal capacity exceeded',
  );
  expect(createAllocation).not.toHaveBeenCalled();
  expect(aggregate).toHaveBeenCalledWith({
    where: { programmeId: 'programme-1', animalId: 'animal-1' },
    _sum: { shares: true },
  });

  await expect(
    animals.allocate(scope, 'actor-1', payload),
  ).resolves.toMatchObject({ id: 'share-1', shares: 2 });
  expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
    isolationLevel: 'Serializable',
  });
  expect(audit).toHaveBeenCalledWith({
    data: expect.objectContaining({
      actorId: 'actor-1',
      action: 'SHARES_ALLOCATED',
      targetId: 'share-1',
    }),
  });
});
