import { fileURLToPath } from 'node:url';
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
  StreamableFile,
} from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { FinanceService, money } from '../finance/finance.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegistrationService } from '../registration/registration.service.js';
import type {
  ReportDates,
  ReportExportQuery,
  ReportKind,
  ReportQuery,
} from './reports.dto.js';

type Scope = { organizationId: string; programmeId: string };
type Row = { id: string } & Record<string, unknown>;

const exportLimit = 2000;
const labels: Record<ReportKind, Record<string, string>> = {
  registration: {
    id: 'Registration ID',
    applicant: 'Applicant',
    status: 'Status',
    shares: 'Shares',
    fee: 'Fee (INR minor units)',
    submittedAt: 'Submitted at',
    decidedAt: 'Decided at',
  },
  participant: {
    id: 'Registration ID',
    applicant: 'Participant',
    email: 'Email',
    status: 'Status',
    submittedAt: 'Submitted at',
  },
  animal: {
    id: 'Animal ID',
    reference: 'Reference',
    shareCapacity: 'Share capacity',
    supplierName: 'Supplier',
    procurementCost: 'Procurement cost (INR minor units)',
    procuredAt: 'Procured at',
  },
  allocation: {
    id: 'Allocation ID',
    registrationId: 'Registration ID',
    groupId: 'Group ID',
    animalId: 'Animal ID',
    shares: 'Shares',
  },
  payment: {
    id: 'Payment ID',
    registrationId: 'Registration ID',
    amount: 'Amount (INR minor units)',
    method: 'Method',
    receivedAt: 'Received at',
    status: 'Status',
  },
  expense: {
    id: 'Expense ID',
    category: 'Category',
    amount: 'Amount (INR minor units)',
    description: 'Description',
    incurredAt: 'Incurred at',
  },
  financial: {
    id: 'Programme ID',
    expected: 'Expected (INR minor units)',
    verified: 'Verified (INR minor units)',
    outstanding: 'Outstanding (INR minor units)',
    expenses: 'Expenses (INR minor units)',
  },
  operations: {
    id: 'Operation ID',
    animalId: 'Animal ID',
    department: 'Department',
    status: 'Status',
    stage: 'Stage',
    measuredGrams: 'Measured grams',
    packageCount: 'Packages',
    startsAt: 'Scheduled start',
  },
};

function display(value: unknown): string | number {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number' || typeof value === 'string') return value;
  if (
    typeof value === 'object' &&
    'amountMinor' in value &&
    typeof value.amountMinor === 'number'
  ) {
    return value.amountMinor;
  }
  return '';
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationService,
    private readonly finance: FinanceService,
  ) {}

  async report(scope: Scope, kind: ReportKind, query: ReportQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.rows(
      scope,
      kind,
      query,
      query.limit + 1,
      query.cursor,
    );
    return {
      items: rows.slice(0, query.limit),
      nextCursor: rows.length > query.limit ? rows[query.limit - 1].id : null,
    };
  }

  async export(scope: Scope, kind: ReportKind, query: ReportExportQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.rows(scope, kind, query, exportLimit + 1);
    if (rows.length > exportLimit)
      throw new PayloadTooLargeException(
        'Export exceeds 2,000 rows. Choose a smaller date range.',
      );
    const columns = Object.entries(labels[kind]);
    const buffer =
      query.format === 'xlsx'
        ? await this.xlsx(kind, columns, rows)
        : await this.pdf(kind, columns, rows);
    return new StreamableFile(buffer, {
      type:
        query.format === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition:
        'attachment; filename="qurbanios-' + kind + '.' + query.format + '"',
      length: buffer.length,
    });
  }

  async dashboard(scope: Scope) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const programmeId = scope.programmeId;
    const [
      totalHouseholds,
      totalAnimals,
      registrations,
      finance,
      volunteers,
      operations,
      distribution,
      pendingPayments,
      recentRegistrations,
    ] = await Promise.all([
      this.prisma.household.count({
        where: { organizationId: scope.organizationId },
      }),
      this.prisma.animal.count({ where: { programmeId } }),
      this.prisma.registration.groupBy({
        by: ['status'],
        where: { programmeId },
        _count: { _all: true },
      }),
      this.finance.summary(scope),
      this.prisma.volunteer.groupBy({
        by: ['active'],
        where: { programmeId },
        _count: { _all: true },
      }),
      this.prisma.schedule.groupBy({
        by: ['department', 'status'],
        where: { programmeId, department: { in: ['slaughter', 'processing'] } },
        _count: { _all: true },
      }),
      this.prisma.distributionAllocation.groupBy({
        by: ['status'],
        where: { programmeId },
        _count: { _all: true },
      }),
      this.prisma.payment.count({ where: { programmeId, status: 'pending' } }),
      this.prisma.registration.findMany({
        where: { programmeId },
        orderBy: { submittedAt: 'desc' },
        take: 10,
        select: { id: true, status: true, submittedAt: true },
      }),
    ]);
    const countRegistration = (status: string) =>
      registrations.find((row) => row.status === status)?._count._all ?? 0;
    const totalParticipants = countRegistration('approved');
    const progress = (['slaughter', 'processing'] as const).map(
      (department) => {
        const rows = operations.filter((row) => row.department === department);
        const completed =
          rows.find((row) => row.status === 'completed')?._count._all ?? 0;
        const total = rows.reduce((sum, row) => sum + row._count._all, 0);
        return {
          department,
          completed,
          total,
          percent: total ? Math.round((completed / total) * 100) : 0,
        };
      },
    );

    return {
      totalHouseholds,
      totalParticipants,
      totalAnimals,
      finance,
      registrations: {
        submitted: countRegistration('submitted'),
        approved: totalParticipants,
        rejected: countRegistration('rejected'),
        cancelled: countRegistration('cancelled'),
      },
      volunteers: {
        active: volunteers.find((row) => row.active)?._count._all ?? 0,
        total: volunteers.reduce((sum, row) => sum + row._count._all, 0),
      },
      operations: progress,
      distribution: Object.fromEntries(
        distribution.map((row) => [row.status, row._count._all]),
      ),
      pendingActions: {
        registrations: countRegistration('submitted'),
        payments: pendingPayments,
      },
      recentActivity: recentRegistrations.map((row) => ({
        kind: 'registration',
        ...row,
      })),
    };
  }

  private async rows(
    scope: Scope,
    kind: ReportKind,
    dates: ReportDates,
    take: number,
    cursor?: string,
  ): Promise<Row[]> {
    const range = this.range(dates);
    if (range && (kind === 'allocation' || kind === 'financial')) {
      throw new BadRequestException(
        'Date filters are unavailable for this report',
      );
    }
    const { programmeId } = scope;
    const where = { programmeId, id: cursor ? { gt: cursor } : undefined };
    const paging = { take, orderBy: { id: 'asc' as const } };
    switch (kind) {
      case 'registration':
      case 'participant': {
        const rows = await this.prisma.registration.findMany({
          where: {
            ...where,
            submittedAt: range,
            status: kind === 'participant' ? 'approved' : undefined,
          },
          ...paging,
          select: {
            id: true,
            status: true,
            shares: true,
            feeMinor: true,
            submittedAt: true,
            decidedAt: true,
            applicant: { select: { name: true, email: true } },
          },
        });
        return rows.map(({ applicant, feeMinor, ...row }) =>
          kind === 'participant'
            ? {
                id: row.id,
                status: row.status,
                submittedAt: row.submittedAt,
                applicant: applicant.name,
                email: applicant.email,
              }
            : { ...row, applicant: applicant.name, fee: money(feeMinor) },
        );
      }
      case 'animal': {
        const rows = await this.prisma.animal.findMany({
          where: { ...where, procuredAt: range },
          ...paging,
          select: {
            id: true,
            reference: true,
            shareCapacity: true,
            supplierName: true,
            procurementCostMinor: true,
            procuredAt: true,
          },
        });
        return rows.map(({ procurementCostMinor, ...row }) => ({
          ...row,
          procurementCost:
            procurementCostMinor === null ? null : money(procurementCostMinor),
        }));
      }
      case 'allocation':
        return this.prisma.shareAllocation.findMany({
          where,
          ...paging,
          select: {
            id: true,
            registrationId: true,
            groupId: true,
            animalId: true,
            shares: true,
          },
        });
      case 'payment': {
        const rows = await this.prisma.payment.findMany({
          where: { ...where, receivedAt: range },
          ...paging,
          select: {
            id: true,
            registrationId: true,
            amountMinor: true,
            method: true,
            receivedAt: true,
            status: true,
          },
        });
        return rows.map(({ amountMinor, ...row }) => ({
          ...row,
          amount: money(amountMinor),
        }));
      }
      case 'expense': {
        const rows = await this.prisma.expense.findMany({
          where: { ...where, incurredAt: range },
          ...paging,
          select: {
            id: true,
            amountMinor: true,
            description: true,
            incurredAt: true,
            category: { select: { name: true } },
          },
        });
        return rows.map(({ category, amountMinor, ...row }) => ({
          ...row,
          category: category.name,
          amount: money(amountMinor),
        }));
      }
      case 'financial':
        return cursor
          ? []
          : [{ id: programmeId, ...(await this.finance.summary(scope)) }];
      case 'operations':
        return this.prisma.schedule.findMany({
          where: {
            ...where,
            startsAt: range,
            department: { in: ['slaughter', 'processing'] },
          },
          ...paging,
          select: {
            id: true,
            animalId: true,
            department: true,
            status: true,
            stage: true,
            measuredGrams: true,
            packageCount: true,
            startsAt: true,
          },
        });
    }
  }

  private range(input: ReportDates): Prisma.DateTimeFilter | undefined {
    const from = input.from ? new Date(input.from) : undefined;
    const to = input.to ? new Date(input.to) : undefined;
    if (from && to && from >= to)
      throw new BadRequestException('Report end must follow start');
    return from || to ? { gte: from, lt: to } : undefined;
  }

  private async xlsx(
    kind: ReportKind,
    columns: [string, string][],
    rows: Row[],
  ) {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(kind);
    sheet.columns = columns.map(([key, header]) => ({
      header,
      key,
      width: 26,
    }));
    for (const row of rows)
      sheet.addRow(columns.map(([key]) => display(row[key])));
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private pdf(
    kind: ReportKind,
    columns: [string, string][],
    rows: Row[],
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({
        margin: 36,
        font: fileURLToPath(
          new URL('./fonts/NotoSansMalayalam.ttf', import.meta.url),
        ),
      });
      const chunks: Buffer[] = [];
      document.on('data', (chunk: Buffer) => chunks.push(chunk));
      document.once('error', reject);
      document.once('end', () => resolve(Buffer.concat(chunks)));
      document.fontSize(18).text('QurbaniOS ' + kind + ' report');
      document.moveDown();
      document.fontSize(9);
      for (const row of rows) {
        document.text(
          columns
            .map(([key, label]) => label + ': ' + String(display(row[key])))
            .join('\n'),
        );
        document.moveDown();
      }
      if (!rows.length) document.text('No records');
      document.end();
    });
  }
}
