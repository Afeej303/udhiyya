import { expect, it, vi } from 'vitest';
import type { AuthorizationLookupService } from '../common/services/authorization-lookup.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationService } from '../registration/registration.service.js';
import { FinanceService } from './finance.service.js';

it('prevents overpayment and creates one receipt when a pending payment is verified', async () => {
  const payment = {
    id: 'pay-1',
    registrationId: 'reg-1',
    status: 'pending',
    amountMinor: 3000,
    registration: {
      status: 'approved',
      feeMinor: 10000,
      applicantId: 'applicant-1',
    },
    receipt: null,
  };
  const receiptCreate = vi.fn().mockResolvedValue({ id: 'receipt-1' });
  const update = vi.fn().mockResolvedValue({ ...payment, status: 'verified' });
  const findFirst = vi.fn().mockResolvedValue(payment);
  const aggregate = vi
    .fn()
    .mockResolvedValueOnce({ _sum: { amountMinor: 8000 } })
    .mockResolvedValueOnce({ _sum: { amountMinor: 7000 } });
  const tx = {
    payment: { findFirst, aggregate, update },
    receipt: { create: receiptCreate },
    userNotification: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  const registrations = {
    getProgramme: vi.fn().mockResolvedValue({ id: 'programme-1' }),
  };
  const finance = new FinanceService(
    prisma as unknown as PrismaService,
    registrations as unknown as RegistrationService,
    {} as AuthorizationLookupService,
  );
  const scope = { organizationId: 'org-1', programmeId: 'programme-1' };

  await expect(
    finance.verify(scope, 'pay-1', 'actor-1', { action: 'verify' }),
  ).rejects.toThrow('Payment exceeds the outstanding balance');
  expect(update).not.toHaveBeenCalled();
  expect(receiptCreate).not.toHaveBeenCalled();

  await expect(
    finance.verify(scope, 'pay-1', 'actor-1', { action: 'verify' }),
  ).resolves.toMatchObject({ status: 'verified', receiptId: 'receipt-1' });

  findFirst.mockResolvedValueOnce({
    ...payment,
    status: 'verified',
    receipt: { id: 'receipt-1' },
  });
  await expect(
    finance.verify(scope, 'pay-1', 'actor-1', { action: 'verify' }),
  ).resolves.toMatchObject({ status: 'verified', receiptId: 'receipt-1' });
  expect(receiptCreate).toHaveBeenCalledTimes(1);
});
