import { expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import type { EmailService } from '../email/email.service.js';
import type { FinanceService } from '../finance/finance.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationService } from '../registration/registration.service.js';
import { OperationsService } from './operations.service.js';

it('limits processing writes to the assigned team and requires completed slaughter and measured stock', async () => {
  const volunteer = {
    id: 'volunteer-1',
    userId: 'user-1',
    departments: ['processing'],
  };
  const schedule = {
    id: 'schedule-1',
    programmeId: 'programme-1',
    animalId: 'animal-1',
    department: 'processing',
    status: 'in_progress',
    stage: 'packaging',
    measuredGrams: null,
    packageCount: null,
    team: [{ volunteer: { id: volunteer.id, name: 'Example' } }],
  };
  const update = vi
    .fn()
    .mockResolvedValue({
      ...schedule,
      status: 'completed',
      measuredGrams: 500,
      packageCount: 1,
    });
  const findFirst = vi
    .fn()
    .mockResolvedValueOnce({ ...schedule, team: [] })
    .mockResolvedValueOnce(schedule)
    .mockResolvedValueOnce(null)
    .mockResolvedValueOnce(schedule)
    .mockResolvedValueOnce({ id: 'completed-slaughter' })
    .mockResolvedValueOnce(schedule)
    .mockResolvedValueOnce({ id: 'completed-slaughter' });
  const tx = {
    volunteer: { findFirst: vi.fn().mockResolvedValue(volunteer) },
    schedule: { findFirst, update },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  const registrations = {
    getProgramme: vi.fn().mockResolvedValue({ id: schedule.programmeId }),
  };
  const operations = new OperationsService(
    prisma as unknown as PrismaService,
    registrations as unknown as RegistrationService,
    {} as FinanceService,
    {} as EmailService,
  );
  const actor = {
    id: volunteer.userId,
    email: 'volunteer@example.com',
    emailVerifiedAt: new Date(0),
  } as AuthenticatedUser;
  const scope = { organizationId: 'org-1', programmeId: schedule.programmeId };

  await expect(
    operations.operationProgress(scope, schedule.id, actor, {
      status: 'completed',
    }),
  ).rejects.toThrow('Schedule not found');
  await expect(
    operations.operationProgress(scope, schedule.id, actor, {
      status: 'completed',
    }),
  ).rejects.toThrow('Complete slaughter');
  await expect(
    operations.operationProgress(scope, schedule.id, actor, {
      status: 'completed',
    }),
  ).rejects.toThrow('record actual weight');
  expect(update).not.toHaveBeenCalled();
  await expect(
    operations.operationProgress(scope, schedule.id, actor, {
      status: 'completed',
      measuredGrams: 500,
      packageCount: 1,
    }),
  ).resolves.toMatchObject({
    status: 'completed',
    measuredGrams: 500,
    packageCount: 1,
  });
});
