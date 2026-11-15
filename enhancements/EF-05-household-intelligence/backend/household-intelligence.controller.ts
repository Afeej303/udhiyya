/**
 * EF-05: Household Intelligence – Controller
 * Owned by M3. Mounted via M2's flag-guarded extension hook under /api/ext/EF-05.
 */
import { Controller, Get, Post, Body, Query, Res, HttpStatus, UseGuards, CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { HouseholdIntelligenceService, DetectionResult, DuplicateCluster, ResolveInput } from './household-intelligence.service.ts';

@Injectable()
export class ExtensionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException('Authentication required');
    const role = String(req.user.role || '').toUpperCase();
    const roles = Array.isArray(req.user.roles) ? req.user.roles.map((r: any) => String(r).toUpperCase()) : [];
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN' || roles.includes('ADMIN') || roles.includes('SUPERADMIN');
    if (!isAdmin) throw new ForbiddenException('Admin role required');
    return true;
  }
}

@Controller('api/ext/EF-05')
@UseGuards(ExtensionAdminGuard)
export class HouseholdIntelligenceController {
  private readonly householdService: HouseholdIntelligenceService;

  constructor(householdService: HouseholdIntelligenceService) {
    this.householdService = householdService;
  }

  private isEnabled(): boolean { return process.env.FEATURE_EF_05 === 'on'; }

  @Get('duplicates')
  async getDuplicates(@Query('programmeId') programmeId: string, @Res() res: Response) {
    if (!this.isEnabled()) return res.status(HttpStatus.FORBIDDEN).json({ error: 'Forbidden' });
    if (!programmeId) throw new BadRequestException('programmeId required');
    try {
      const result: DetectionResult = await this.householdService.detectDuplicates(programmeId.trim());
      return res.status(HttpStatus.OK).json(result);
    } catch (err: any) {
      if (err.message?.includes('not found')) throw new NotFoundException(err.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  }

  @Post('resolve')
  async resolveDuplicate(@Body() body: ResolveInput, @Res() res: Response) {
    if (!this.isEnabled()) return res.status(HttpStatus.FORBIDDEN).json({ error: 'Forbidden' });
    try {
      const cluster: DuplicateCluster = await this.householdService.resolveDuplicate(body);
      return res.status(HttpStatus.OK).json({ success: true, cluster });
    } catch (err: any) {
      if (err.message?.includes('not found')) throw new NotFoundException(err.message);
      if (err.message === 'INVALID_ACTION' || err.message === 'NO_PROGRAMME_CONTEXT') throw new BadRequestException(err.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: err.message });
    }
  }
}
