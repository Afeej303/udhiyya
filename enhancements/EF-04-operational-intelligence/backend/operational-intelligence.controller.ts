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
 */
@Injectable()
export class ExtensionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException('Authentication required');

    const role = req.user.role ? String(req.user.role).toUpperCase() : '';
    const roles = Array.isArray(req.user.roles) ? req.user.roles.map((r: any) => String(r).toUpperCase()) : [];
    const roleSlugs = Array.isArray(req.user.roleSlugs) ? req.user.roleSlugs.map((r: any) => String(r).toUpperCase()) : [];

    const isAdmin =
      role === 'ADMIN' ||
      role === 'SUPERADMIN' ||
      roles.includes('ADMIN') ||
      roles.includes('SUPERADMIN') ||
      roleSlugs.includes('ADMIN') ||
      roleSlugs.includes('SUPERADMIN') ||
      (req.user.role && String(req.user.role).toLowerCase() === 'admin');

    if (!isAdmin) throw new ForbiddenException('Admin role required for operational intelligence.');
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

  private isFeatureEnabled(): boolean {
    return process.env.FEATURE_EF_04 === 'on';
  }

  @Get('status')
  async getStatus(@Query('programmeId') programmeIdStr: string, @Res() res: Response) {
    if (!this.isFeatureEnabled()) return res.status(HttpStatus.FORBIDDEN).json({ error: 'Feature disabled' });
    const programmeId = Number(programmeIdStr);
    if (isNaN(programmeId)) return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid ID' });
    
    try {
      const status = await this.service.getStatus(programmeId);
      return res.status(HttpStatus.OK).json(status);
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
  }

  @Get('issues')
  async getIssues(@Query('programmeId') programmeIdStr: string, @Res() res: Response) {
    if (!this.isFeatureEnabled()) return res.status(HttpStatus.FORBIDDEN).json({ error: 'Feature disabled' });
    const programmeId = Number(programmeIdStr);
    if (isNaN(programmeId)) return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Invalid ID' });

    try {
      const issues = await this.service.getIssues(programmeId);
      return res.status(HttpStatus.OK).json({ issues });
    } catch (e: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: e.message });
    }
  }
}
