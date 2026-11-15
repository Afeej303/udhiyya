import { expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma/prisma.service.js';
import { ProgrammesService } from './programmes.service.js';

it('keeps programmes open while work is unresolved and archives them once with an audit event', async () => {
  const programme = {
    id: 'programme-1',
    organizationId: 'org-1',
    status: 'published',
  };
  const findFirst = vi.fn().mockResolvedValue(programme);
  const update = vi
    .fn()
    .mockResolvedValue({
      ...programme,
      status: 'closed',
      closedAt: new Date(0),
    });
  const pending = vi.fn().mockResolvedValueOnce(1).mockResolvedValue(0);
  const audit = vi.fn().mockResolvedValue({});
  const tx = {
    programme: { findFirst, update },
    registration: { count: vi.fn().mockResolvedValue(0) },
    payment: { count: pending },
    schedule: { count: vi.fn().mockResolvedValue(0) },
    distributionAllocation: { count: vi.fn().mockResolvedValue(0) },
    auditLog: { create: audit },
  };
  const prisma = {
    $transaction: vi.fn(async (work: (client: typeof tx) => unknown) =>
      work(tx),
    ),
  };
  const programmes = new ProgrammesService(prisma as unknown as PrismaService);

  await expect(
    programmes.close('org-1', programme.id, 'actor-1'),
  ).rejects.toThrow('Finish registration review');
  expect(update).not.toHaveBeenCalled();

  await expect(
    programmes.close('org-1', programme.id, 'actor-1'),
  ).resolves.toMatchObject({ status: 'closed' });
  expect(audit).toHaveBeenCalledWith({
    data: expect.objectContaining({
      actorId: 'actor-1',
      action: 'PROGRAMME_CLOSED',
    }),
  });

  findFirst.mockResolvedValueOnce({ ...programme, status: 'closed' });
  await expect(
    programmes.close('org-1', programme.id, 'actor-1'),
  ).resolves.toMatchObject({ status: 'closed' });
  expect(update).toHaveBeenCalledTimes(1);
});
