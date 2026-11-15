/**
 * EF-01: Analytics Dashboard – Controller
 * Owned by M3. Mounted via M2's extension hook under /api/ext/EF-01.
 * Returns 403 when FEATURE_EF_01 is not 'on'.
 *
 * Auth Contract:
 * Requires verified identity and explicit Admin privileges.
 * Fails closed: if user identity is absent or unverified, request is rejected with 401.
 * If user lacks explicit ADMIN role, request is rejected with 403.
 */

import {
  Controller,
  Get,
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
  AnalyticsService,
  SUPPORTED_CHART_TYPES,
} from './analytics.service.ts';
import type {
  ChartType,
} from './analytics.service.ts';

/**
 * Strict Admin Guard for EF-01.
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
    if (role !== 'ADMIN') {
      throw new ForbiddenException(
        'Admin role required for analytics operations.',
      );
    }

    return true;
  }
}

@Controller('api/ext/EF-01')
@UseGuards(ExtensionAdminGuard)
export class AnalyticsController {
  private readonly service: AnalyticsService;

  constructor(service: AnalyticsService) {
    this.service = service;
  }

  private featureEnabled(): boolean {
    return process.env.FEATURE_EF_01 === 'on';
  }

  /**
   * GET /api/ext/EF-01/summary?programmeId=:id
   * Returns aggregated analytics metrics (participant counts, weight distribution averages, payment progress, share capacity)
   */
  @Get('summary')
  async getSummary(
    @Query('programmeId') programmeIdStr: string,
    @Res() res: Response,
  ) {
    if (!this.featureEnabled()) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'Feature EF-01 is disabled' });
    }

    const programmeId = Number(programmeIdStr);
    if (!programmeIdStr || isNaN(programmeId) || programmeId <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'programmeId is required and must be a valid positive number',
      });
    }

    try {
      const summary = await this.service.getSummary(programmeId);
      return res.status(HttpStatus.OK).json(summary);
    } catch (err: any) {
      if (err.message && err.message.startsWith('NOT_FOUND:')) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: err.message.replace('NOT_FOUND: ', '') });
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || 'Failed to fetch analytics summary' });
    }
  }

  /**
   * GET /api/ext/EF-01/charts?type=:chartType&programmeId=:id
   * Returns chart timeseries / category dataset
   */
  @Get('charts')
  async getCharts(
    @Query('programmeId') programmeIdStr: string,
    @Query('type') chartTypeParam: string,
    @Res() res: Response,
  ) {
    if (!this.featureEnabled()) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'Feature EF-01 is disabled' });
    }

    const programmeId = Number(programmeIdStr);
    if (!programmeIdStr || isNaN(programmeId) || programmeId <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: 'programmeId is required and must be a valid positive number',
      });
    }

    const type = (chartTypeParam || 'all').toLowerCase() as ChartType;
    if (!SUPPORTED_CHART_TYPES.includes(type)) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        error: `Invalid chart type: '${chartTypeParam}'. Supported types: ${SUPPORTED_CHART_TYPES.join(', ')}`,
      });
    }

    try {
      const chartData = await this.service.getCharts(programmeId, type);
      return res.status(HttpStatus.OK).json({
        programmeId,
        chartType: type,
        data: chartData,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (err.message && err.message.startsWith('NOT_FOUND:')) {
        return res
          .status(HttpStatus.NOT_FOUND)
          .json({ error: err.message.replace('NOT_FOUND: ', '') });
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || 'Failed to fetch analytics charts' });
    }
  }
}
