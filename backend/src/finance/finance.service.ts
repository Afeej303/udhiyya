import { addUserNotice } from '../communications/user-notice.js';
import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthorizationLookupService } from '../common/services/authorization-lookup.service.js';
import {
  Prisma,
  type Expense,
  type Payment,
  type Receipt,
} from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import { RegistrationService } from '../registration/registration.service.js';
import type {
  CreatePaymentDto,
  ExpenseCategoryDto,
  ExpenseDto,
  PaymentQuery,
  UpdateExpenseDto,
  VerifyPaymentDto,
} from './finance.dto.js';

type Scope = { organizationId: string; programmeId: string };
type Client = Prisma.TransactionClient;

export function money(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor))
    throw new ConflictException('Amount exceeds the supported range');
  return { amountMinor, currency: 'INR' };
}

function paymentView(payment: Payment) {
  return {
    id: payment.id,
    registrationId: payment.registrationId,
    amount: money(payment.amountMinor),
    method: payment.method,
    reference: payment.reference,
    receivedAt: payment.receivedAt,
    status: payment.status,
    decisionReason: payment.decisionReason,
    decidedAt: payment.decidedAt,
  };
}

function receiptView(receipt: Receipt) {
  return {
    id: receipt.id,
    receiptNumber: receipt.id.toUpperCase(),
    issuedAt: receipt.issuedAt,
    kind: receipt.kind,
    amount: receipt.amountMinor === null ? null : money(receipt.amountMinor),
    associatedRecordId: receipt.paymentId ?? receipt.registrationId,
  };
}

function expenseView(expense: Expense) {
  return {
    id: expense.id,
    categoryId: expense.categoryId,
    amount: money(expense.amountMinor),
    description: expense.description,
    incurredAt: expense.incurredAt,
  };
}

function page<T extends { id: string }>(rows: T[], limit: number) {
  return {
    items: rows.slice(0, limit),
    nextCursor: rows.length > limit ? rows[limit - 1].id : null,
  };
}

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registrations: RegistrationService,
    private readonly authorization: AuthorizationLookupService,
  ) {}

  async summary(scope: Scope) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    return this.prisma.$transaction(
      async (tx) => {
        const programmeId = scope.programmeId;
        const expected = await tx.registration.aggregate({
          where: { programmeId, status: 'approved' },
          _sum: { feeMinor: true },
        });
        const collected = await this.verifiedTotal(tx, scope);
        const expenses = await tx.expense.aggregate({
          where: { programmeId },
          _sum: { amountMinor: true },
        });
        const expectedMinor = expected._sum.feeMinor ?? 0;
        return {
          expected: money(expectedMinor),
          verified: money(collected),
          outstanding: money(expectedMinor - collected),
          expenses: money(expenses._sum.amountMinor ?? 0),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async payments(scope: Scope, query: PaymentQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    return this.paymentPage(this.prisma, scope, query);
  }

  async record(scope: Scope, actorId: string, input: CreatePaymentDto) {
    return this.serial((tx) =>
      this.recordInTransaction(tx, scope, actorId, input),
    );
  }

  async recordInTransaction(
    tx: Client,
    scope: Scope,
    actorId: string,
    input: CreatePaymentDto,
    cashAssignmentId?: string,
  ) {
    await this.registrations.getProgramme(tx, scope, false, true);
    const registration = await tx.registration.findFirst({
      where: { id: input.registrationId, programmeId: scope.programmeId },
    });
    if (!registration) throw new NotFoundException('Registration not found');
    if (registration.status !== 'approved')
      throw new ConflictException('Registration must be approved');
    const amountMinor = this.positiveAmount(input.amount.amountMinor);
    const receivedAt = this.date(input.receivedAt);
    const reference = input.reference?.trim() || null;
    const requestKey = createHash('sha256')
      .update(
        JSON.stringify([
          registration.id,
          amountMinor,
          input.method,
          reference,
          receivedAt.toISOString(),
        ]),
      )
      .digest('hex');
    const unique = { programmeId: scope.programmeId, requestKey };
    const existing = await tx.payment.findUnique({
      where: { programmeId_requestKey: unique },
    });
    if (existing) {
      if (
        cashAssignmentId &&
        (cashAssignmentId !== existing.cashAssignmentId ||
          existing.cashSubmittedById !== actorId)
      ) {
        throw new ConflictException(
          'A matching payment has already been submitted',
        );
      }
      return paymentView(existing);
    }
    const payment = await tx.payment.create({
      data: {
        ...unique,
        registrationId: registration.id,
        amountMinor,
        method: input.method,
        reference,
        receivedAt,
        cashAssignmentId,
        cashSubmittedById: cashAssignmentId ? actorId : undefined,
      },
    });
    await this.audit(
      tx,
      scope,
      actorId,
      'PAYMENT_RECORDED',
      'payment',
      payment.id,
    );
    return paymentView(payment);
  }

  async verify(
    scope: Scope,
    id: string,
    actorId: string,
    input: VerifyPaymentDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const payment = await tx.payment.findFirst({
        where: { id, programmeId: scope.programmeId },
        include: { registration: true, receipt: true },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      const status = input.action === 'verify' ? 'verified' : 'rejected';
      if (payment.status === status)
        return {
          ...paymentView(payment),
          receiptId: payment.receipt?.id ?? null,
        };
      if (payment.status !== 'pending')
        throw new ConflictException('Payment was already reviewed');

      if (status === 'verified') {
        if (payment.registration.status !== 'approved')
          throw new ConflictException('Registration must be approved');
        const total = await this.verifiedTotal(
          tx,
          scope,
          payment.registrationId,
        );
        if (payment.amountMinor + total > payment.registration.feeMinor) {
          throw new ConflictException(
            'Payment exceeds the outstanding balance',
          );
        }
      }

      const updated = await tx.payment.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          status,
          decidedAt: new Date(),
          decisionReason: input.reason?.trim() || null,
        },
      });
      const receipt =
        status === 'verified'
          ? await tx.receipt.create({
              data: {
                programmeId: scope.programmeId,
                kind: 'payment',
                paymentId: id,
                registrationId: payment.registrationId,
                amountMinor: payment.amountMinor,
              },
            })
          : null;
      await this.audit(
        tx,
        scope,
        actorId,
        'PAYMENT_' + status.toUpperCase(),
        'payment',
        id,
      );
      await addUserNotice(
        tx,
        scope.programmeId,
        payment.registration.applicantId,
        'Payment reviewed',
        'Your programme payment was ' + status + '.',
      );
      return { ...paymentView(updated), receiptId: receipt?.id ?? null };
    });
  }

  async ownPayments(scope: Scope, userId: string, query: ProgrammeListQuery) {
    const registration = await this.registrations.getOwn(scope, userId);
    return this.prisma.$transaction(
      async (tx) => {
        const list = await this.paymentPage(tx, scope, {
          cursor: query.cursor,
          limit: query.limit,
          registrationId: registration.id,
        });
        const checked = await this.verifiedTotal(tx, scope, registration.id);
        const expected =
          registration.status === 'approved' ? registration.fee.amountMinor : 0;
        return {
          ...list,
          expected: money(expected),
          verified: money(checked),
          outstanding: money(expected - checked),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async ownReceipts(scope: Scope, userId: string, query: ProgrammeListQuery) {
    const registration = await this.registrations.getOwn(scope, userId);
    const rows = await this.prisma.receipt.findMany({
      where: {
        programmeId: scope.programmeId,
        registrationId: registration.id,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows.map(receiptView), query.limit);
  }

  async receipt(scope: Scope, id: string, userId: string) {
    const membership =
      await this.authorization.getOrganizationMembershipContext(
        userId,
        scope.organizationId,
      );
    const administrator =
      membership?.roleSlugs.some(
        (role) => role === 'org_admin' || role === 'org_owner',
      ) ?? false;
    await this.registrations.getProgramme(this.prisma, scope, !administrator);
    const receipt = await this.prisma.receipt.findFirst({
      where: {
        id,
        programmeId: scope.programmeId,
        registration: administrator ? undefined : { applicantId: userId },
      },
    });
    if (!receipt) throw new NotFoundException('Receipt not found');
    return receiptView(receipt);
  }

  async categories(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.expenseCategory.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
      select: { id: true, name: true },
    });
    return page(rows, query.limit);
  }

  async categoryWrite(
    scope: Scope,
    actorId: string,
    input: ExpenseCategoryDto,
    id?: string,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const name = this.requiredText(input.name);
      const data = { name, nameKey: name.toLowerCase() };
      if (id) await this.findCategory(tx, scope, id);
      const row = id
        ? await tx.expenseCategory.update({
            where: { id, programmeId: scope.programmeId },
            data,
          })
        : await tx.expenseCategory.create({
            data: { ...data, programmeId: scope.programmeId },
          });
      await this.audit(
        tx,
        scope,
        actorId,
        id ? 'EXPENSE_CATEGORY_UPDATED' : 'EXPENSE_CATEGORY_CREATED',
        'expense_category',
        row.id,
      );
      return { id: row.id, name: row.name };
    });
  }

  async expenses(scope: Scope, query: ProgrammeListQuery) {
    await this.registrations.getProgramme(this.prisma, scope, false);
    const rows = await this.prisma.expense.findMany({
      where: {
        programmeId: scope.programmeId,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows.map(expenseView), query.limit);
  }

  async createExpense(scope: Scope, actorId: string, input: ExpenseDto) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      await this.findCategory(tx, scope, input.categoryId);
      const expense = await tx.expense.create({
        data: {
          programmeId: scope.programmeId,
          categoryId: input.categoryId,
          amountMinor: this.positiveAmount(input.amount.amountMinor),
          description: this.requiredText(input.description),
          incurredAt: this.date(input.incurredAt),
        },
      });
      await this.audit(
        tx,
        scope,
        actorId,
        'EXPENSE_CREATED',
        'expense',
        expense.id,
      );
      return expenseView(expense);
    });
  }

  async updateExpense(
    scope: Scope,
    id: string,
    actorId: string,
    input: UpdateExpenseDto,
  ) {
    return this.serial(async (tx) => {
      await this.registrations.getProgramme(tx, scope, false, true);
      const existing = await tx.expense.findFirst({
        where: { id, programmeId: scope.programmeId },
      });
      if (!existing) throw new NotFoundException('Expense not found');
      if (
        input.categoryId === null ||
        input.amount === null ||
        input.incurredAt === null
      ) {
        throw new BadRequestException(
          'Supplied expense fields must have a value',
        );
      }
      if (input.categoryId)
        await this.findCategory(tx, scope, input.categoryId);
      const expense = await tx.expense.update({
        where: { id, programmeId: scope.programmeId },
        data: {
          categoryId: input.categoryId,
          amountMinor: input.amount
            ? this.positiveAmount(input.amount.amountMinor)
            : undefined,
          description:
            input.description === undefined
              ? undefined
              : this.requiredText(input.description),
          incurredAt: input.incurredAt
            ? this.date(input.incurredAt)
            : undefined,
        },
      });
      await this.audit(tx, scope, actorId, 'EXPENSE_UPDATED', 'expense', id);
      return expenseView(expense);
    });
  }

  private async paymentPage(client: Client, scope: Scope, query: PaymentQuery) {
    const rows = await client.payment.findMany({
      where: {
        programmeId: scope.programmeId,
        registrationId: query.registrationId,
        status: query.status,
        id: query.cursor ? { gt: query.cursor } : undefined,
      },
      orderBy: { id: 'asc' },
      take: query.limit + 1,
    });
    return page(rows.map(paymentView), query.limit);
  }

  private async verifiedTotal(
    client: Client,
    scope: Scope,
    registrationId?: string,
  ) {
    const result = await client.payment.aggregate({
      where: {
        programmeId: scope.programmeId,
        registrationId,
        status: 'verified',
      },
      _sum: { amountMinor: true },
    });
    return result._sum.amountMinor ?? 0;
  }

  private async findCategory(client: Client, scope: Scope, id: string) {
    const category = await client.expenseCategory.findFirst({
      where: { id, programmeId: scope.programmeId },
    });
    if (!category) throw new NotFoundException('Expense category not found');
    return category;
  }

  private positiveAmount(amount: number) {
    if (amount < 1) throw new BadRequestException('Amount must be positive');
    return amount;
  }

  private requiredText(value: string) {
    const text = value?.trim();
    if (!text) throw new BadRequestException('Value must be non-blank');
    return text;
  }

  private date(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('Invalid timestamp');
    return date;
  }

  private async serial<T>(work: (tx: Client) => Promise<T>) {
    try {
      return await this.prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2034'].includes(error.code)
      ) {
        throw new ConflictException(
          'Duplicate or concurrent finance change. Refresh and retry.',
        );
      }
      throw error;
    }
  }

  private async audit(
    tx: Client,
    scope: Scope,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
  ) {
    await tx.auditLog.create({
      data: {
        organizationId: scope.organizationId,
        actorId,
        action,
        targetType,
        targetId,
      },
    });
  }
}
