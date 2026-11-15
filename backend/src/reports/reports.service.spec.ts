import ExcelJS from 'exceljs';
import { expect, it, vi } from 'vitest';
import type { FinanceService } from '../finance/finance.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationService } from '../registration/registration.service.js';
import { ReportsService } from './reports.service.js';

async function read(stream: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

it('exports programme-scoped results as XLSX and a PDF with the bundled font', async () => {
  const findMany = vi.fn().mockResolvedValue([
    {
      id: 'expense-1',
      category: { name: 'വിതരണം' },
      amountMinor: 1500,
      description: 'Example expense',
      incurredAt: new Date(0),
    },
  ]);
  const reports = new ReportsService(
    { expense: { findMany } } as unknown as PrismaService,
    { getProgramme: vi.fn() } as unknown as RegistrationService,
    {} as FinanceService,
  );
  const scope = { organizationId: 'org-1', programmeId: 'programme-1' };
  const xlsx = await reports.export(scope, 'expense', { format: 'xlsx' });
  expect(xlsx.getHeaders().type).toContain('spreadsheetml');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    Uint8Array.from(await read(xlsx.getStream())).buffer,
  );
  const sheet = workbook.getWorksheet('expense');
  expect(sheet?.getCell('B2').value).toBe('വിതരണം');
  expect(sheet?.getCell('C2').value).toBe(1500);

  const pdf = await reports.export(scope, 'expense', { format: 'pdf' });
  expect(pdf.getHeaders().type).toBe('application/pdf');
  const data = await read(pdf.getStream());
  expect(data.subarray(0, 5).toString()).toBe('%PDF-');
  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({ programmeId: 'programme-1' }),
    }),
  );
});
