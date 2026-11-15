/**
 * EF-04: Operational Intelligence – Controller
 * Owned by M3. Mounted via M2's extension hook under /api/ext/EF-04.
 * Returns 403 when FEATURE_EF_04 is not 'on'.
 *
 * Auth Contract:
 * Requires verified identity and Admin privileges.
 * Fails closed: if user identity is absent, rejected with 401.
 * If user lacks explicit ADMIN role, rejected with 403.
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
import { OperationalIntelligenceService } from './operational-intelligence.service.ts';

/**
 * Strict Admin Guard for EF-04.
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
        'Admin role required for operational intelligence operations.',
      );
    }

    return true;
  }
}

@Controller('api/ext/EF-04')
@UseGuards(ExtensionAdminGuard)
export class OperationalIntelligenceController {
  private readonly service: OperationalIntelligenceService;

  constructor(service?: OperationalIntelligenceService) {
    this.service = service || new OperationalIntelligenceService();
  }

  /**
   * Helper checking feature flag state.
   */
  private isFeatureEnabled(): boolean {
    return process.env.FEATURE_EF_04 === 'on';
  }

  /**
   * GET /api/ext/EF-04/status?programmeId=:id
   * Operational summary: slaughter progress, processing completion, packages distributed.
   */
  @Get('status')
  async getStatus(
    @Query('programmeId') programmeIdStr: string,
    @Res() res: Response,
  ) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-04 (Operational Intelligence) is currently disabled.',
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
      const status = await this.service.getStatus(programmeId);
      return res.status(HttpStatus.OK).json(status);
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
        message: err.message || 'Failed to generate operational status.',
      });
    }
  }

  /**
   * GET /api/ext/EF-04/issues?programmeId=:id
   * Detected bottlenecks, overdue tasks, and department-level delay flags.
   */
  @Get('issues')
  async getIssues(
    @Query('programmeId') programmeIdStr: string,
    @Res() res: Response,
  ) {
    if (!this.isFeatureEnabled()) {
      return res.status(HttpStatus.FORBIDDEN).json({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: 'Feature EF-04 (Operational Intelligence) is currently disabled.',
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
      const issues = await this.service.getIssues(programmeId);
      return res.status(HttpStatus.OK).json({
        programmeId,
        totalIssues: issues.length,
        highSeverityIssues: issues.filter((i: any) => i.severity === 'high').length,
        issues,
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
        message: err.message || 'Failed to detect operational issues.',
      });
    }
  }
}
