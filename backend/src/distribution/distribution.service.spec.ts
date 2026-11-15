import { expect, it, vi } from 'vitest';
import type { EmailService } from '../email/email.service.js';
import type { OperationsService } from '../operations/operations.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationService } from '../registration/registration.service.js';
import { DistributionService } from './distribution.service.js';

it('reserves only measured stock and never sends the handoff reference to committee lists', async () => {
  const record = {
    id: 'allocation-1',
    recipientType: 'beneficiary',
    beneficiaryId: 'beneficiary-1',
    registrationId: null,
    quantityGrams: 100,
    collectionWindowId: 'window-1',
    status: 'draft',
  };
  const update = vi
    .fn()
    .mockResolvedValue({
      ...record,
      status: 'confirmed',
      collectionReference: 'private',
    });
  const stock = vi
    .fn()
    .mockResolvedValueOnce({ _sum: { quantityGrams: 150 } })
    .mockResolvedValueOnce({ _sum: { quantityGrams: 100 } });
  const tx = {
    distributionAllocation: {
      findFirst: vi.fn().mockResolvedValue(record),
      aggregate: stock,
      update,
    },
    distributionPolicy: {
      findUnique: vi
        .fn()
        .mockResolvedValue({
          beneficiariesEnabled: true,
          gramsPerHousehold: 120,
        }),
    },
    beneficiary: {
      findFirst: vi.fn().mockResolvedValue({ eligibility: 'approved' }),
    },
    schedule: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { measuredGrams: 200 } }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  const distribution = new DistributionService(
    prisma as unknown as PrismaService,
    { getProgramme: vi.fn() } as unknown as RegistrationService,
    {} as OperationsService,
    {} as EmailService,
  );
  const scope = { organizationId: 'org-1', programmeId: 'programme-1' };

  await expect(
    distribution.transition(scope, record.id, 'actor-1', { action: 'confirm' }),
  ).rejects.toThrow('Insufficient distribution stock');
  expect(update).not.toHaveBeenCalled();

  const confirmed = await distribution.transition(scope, record.id, 'actor-1', {
    action: 'confirm',
  });
  expect(confirmed.status).toBe('confirmed');
  expect(confirmed).not.toHaveProperty('collectionReference');
  expect(tx.schedule.aggregate).toHaveBeenCalledWith({
    where: {
      programmeId: 'programme-1',
      department: 'processing',
      status: 'completed',
    },
    _sum: { measuredGrams: true },
  });
  expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
    isolationLevel: 'Serializable',
  });
});
