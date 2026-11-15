import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { OWNER_SCOPED_PROGRAMME_ROUTE } from '../common/constants/auth.constants.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import {
  CreatePaymentDto,
  ExpenseCategoryDto,
  ExpenseDto,
  PaymentQuery,
  UpdateExpenseDto,
  VerifyPaymentDto,
} from './finance.dto.js';
import { FinanceService } from './finance.service.js';

class ProgrammeParams {
  @IsUUID() orgId!: string;
  @IsUUID() programmeId!: string;
}

class RecordParams extends ProgrammeParams {
  @IsUUID() id!: string;
}

function scope(params: ProgrammeParams) {
  return { organizationId: params.orgId, programmeId: params.programmeId };
}

@Controller('organisations/:orgId/programmes/:programmeId')
@Roles('org_admin', 'org_owner')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('finance/summary')
  summary(@Param() params: ProgrammeParams) {
    return this.finance.summary(scope(params));
  }

  @Get('payments')
  payments(@Param() params: ProgrammeParams, @Query() query: PaymentQuery) {
    return this.finance.payments(scope(params), query);
  }

  @Post('payments')
  record(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreatePaymentDto,
  ) {
    return this.finance.record(scope(params), user.id, input);
  }

  @Post('payments/:id/verification')
  @HttpCode(200)
  verify(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: VerifyPaymentDto,
  ) {
    return this.finance.verify(scope(params), params.id, user.id, input);
  }

  @Get('expense-categories')
  categories(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.finance.categories(scope(params), query);
  }

  @Post('expense-categories')
  createCategory(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ExpenseCategoryDto,
  ) {
    return this.finance.categoryWrite(scope(params), user.id, input);
  }

  @Patch('expense-categories/:id')
  updateCategory(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ExpenseCategoryDto,
  ) {
    return this.finance.categoryWrite(scope(params), user.id, input, params.id);
  }

  @Get('expenses')
  expenses(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.finance.expenses(scope(params), query);
  }

  @Post('expenses')
  createExpense(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: ExpenseDto,
  ) {
    return this.finance.createExpense(scope(params), user.id, input);
  }

  @Patch('expenses/:id')
  updateExpense(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateExpenseDto,
  ) {
    return this.finance.updateExpense(scope(params), params.id, user.id, input);
  }
}

@Controller('organisations/:orgId/programmes/:programmeId')
@SetMetadata(OWNER_SCOPED_PROGRAMME_ROUTE, true)
export class ParticipantFinanceController {
  constructor(private readonly finance: FinanceService) {}

  @Get('me/payments')
  payments(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.finance.ownPayments(scope(params), user.id, query);
  }

  @Get('me/receipts')
  receipts(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.finance.ownReceipts(scope(params), user.id, query);
  }

  @Get('receipts/:id')
  receipt(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.finance.receipt(scope(params), params.id, user.id);
  }
}
