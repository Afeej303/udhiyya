/**
 * EF-03: Financial Intelligence – Controller
 * Owned by M3. Mounted via M2's flag-guarded extension hook under /api/ext/EF-03.
 * Returns 403 when FEATURE_EF_03 is not 'on'.
 *
 * Auth Contract:
 * Requires verified identity and Admin privileges.
 * Fails closed: if user identity is absent or unverified, rejected with 401.
 * If user lacks explicit ADMIN role, rejected with 403.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  HttpStatus,
  UseGuards,
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  FinancialIntelligenceService,
  EXPENSE_CATEGORIES_META,
} from './financial-intelligence.service.ts';
import type {
  ExpenseInput,
} from './financial-intelligence.service.ts';

/**
 * Strict Admin Guard for EF-03.
 * Fails closed: Requires upstream verification (req.user attached by M2's JwtAuthGuard)
 * AND verifies explicit admin role claim.
 */
@Injectable()
export class ExtensionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    // 1. Verify upstream authentication attached user identity
    if (!req.user) {
      throw new UnauthorizedException(
        'Authentication required: Missing authenticated user context. Ensure M2 JwtAuthGuard is loaded upstream.',
      );
    }

    // 2. Enforce explicit Admin role
    const role = req.user.role ? String(req.user.role).toUpperCase() : '';
    const roles = Array.isArray(req.user.roles)
      ? req.user.roles.map((r: any) => String(r).toUpperCase())
      : [];
    const roleSlugs = Array.isArray(req.user.roleSlugs)
      ? req.user.roleSlugs.map((r: any) => String(r).toUpperCase())
      : [];

    const isAdmin =
      role === 'ADMIN' ||
      role === 'SUPERADMIN' ||
      roles.includes('ADMIN') ||
      roles.includes('SUPERADMIN') ||
      roleSlugs.includes('ADMIN') ||
      roleSlugs.includes('SUPERADMIN') ||
      (req.user.role && String(req.user.role).toLowerCase() === 'admin');

    if (!isAdmin) {
      throw new ForbiddenException(
        'Admin role required for financial intelligence operations.',
      );
    }

    return true;
  }
}

@Controller('api/ext/EF-03')
@UseGuards(ExtensionAdminGuard)
export class FinancialIntelligenceController {
  private readonly financialService: FinancialIntelligenceService;

  constructor(financialService: FinancialIntelligenceService) {
    this.financialService = financialService;
  }

  /**
   * Helper checking feature flag state.
   */
  private isFeatureEnabled(): boolean {
    return process.env.FEATURE_EF_03 === 'on';
  }

  /**
   * GET /api/ext/EF-03/summary?programmeId=:id
   * Financial reconciliation overview: revenues, expenses, balance, anomalies.
   */
  @Get('summary')
  async getSummary(
    @Query('programmeId') programmeIdStr: string,
    @Res() res: Response,
  ) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-03 (Financial Intelligence) is currently disabled.',
      });
    }

    const programmeId = Number(programmeIdStr);
    if (!programmeIdStr || isNaN(programmeId) || programmeId <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'A valid numeric programmeId is required.',
      });
    }

    try {
      const summary = await this.financialService.getSummary(programmeId);
      return res.status(HttpStatus.OK).json(summary);
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('not found') || err.message.startsWith('NOT_FOUND:'))
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: err.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: err.message || 'Failed to generate financial summary.',
      });
    }
  }

  /**
   * GET /api/ext/EF-03/anomalies?programmeId=:id
   * Detects payment discrepancies, duplicate transaction references, and unallocated shares.
   */
  @Get('anomalies')
  async getAnomalies(
    @Query('programmeId') programmeIdStr: string,
    @Res() res: Response,
  ) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-03 (Financial Intelligence) is currently disabled.',
      });
    }

    const programmeId = Number(programmeIdStr);
    if (!programmeIdStr || isNaN(programmeId) || programmeId <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'A valid numeric programmeId is required.',
      });
    }

    try {
      const anomalies = await this.financialService.detectAnomalies(programmeId);
      return res.status(HttpStatus.OK).json({
        programmeId,
        totalAnomalies: anomalies.length,
        anomalies,
      });
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('not found') || err.message.startsWith('NOT_FOUND:'))
      ) {
        return res.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          error: 'Not Found',
          message: err.message,
        });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: err.message || 'Failed to inspect financial anomalies.',
      });
    }
  }

  /**
   * POST /api/ext/EF-03/categorise
   * Auto-categorises a batch of operational expenses.
   */
  @Post('categorise')
  async categoriseExpenses(
    @Body() body: any,
    @Res() res: Response,
  ) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-03 (Financial Intelligence) is currently disabled.',
      });
    }

    const expensesList: any[] = Array.isArray(body)
      ? body
      : Array.isArray(body?.expenses)
      ? body.expenses
      : Array.isArray(body?.items)
      ? body.items
      : null;

    if (!expensesList) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        message: 'Request body must contain an "expenses" or "items" array, or be an array.',
      });
    }

    // Normalize expenses: support amountMinor or amount (in rupees)
    const normalizedExpenses: ExpenseInput[] = expensesList.map((item, idx) => {
      let amountMinor = item.amountMinor;
      if (amountMinor === undefined && item.amount !== undefined) {
        amountMinor = Math.round(Number(item.amount) * 100);
      }
      return {
        id: item.id ? String(item.id) : `exp-${idx + 1}`,
        description: String(item.description || ''),
        amountMinor: Number(amountMinor) || 0,
        date: item.date ? String(item.date) : undefined,
        reference: item.reference ? String(item.reference) : undefined,
        paidTo: item.paidTo ? String(item.paidTo) : undefined,
        notes: item.notes ? String(item.notes) : undefined,
      };
    });

    try {
      const result = this.financialService.categoriseBatch(normalizedExpenses);
      return res.status(HttpStatus.OK).json(result);
    } catch (err: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: err.message || 'Failed to auto-categorise expenses.',
      });
    }
  }

  /**
   * GET /api/ext/EF-03/categories
   * Returns supported expense categories and descriptions.
   */
  @Get('categories')
  async getCategories(@Res() res: Response) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-03 (Financial Intelligence) is currently disabled.',
      });
    }

    return res.status(HttpStatus.OK).json({
      categories: Object.values(EXPENSE_CATEGORIES_META),
    });
  }
}
