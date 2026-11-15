/**
 * EF-02: Smart Allocation Engine – Controller
 * Owned by M3. Mounted via M2's extension hook under /api/ext/EF-02.
 * Returns 403 when FEATURE_EF_02 is not 'on'.
 *
 * Auth Contract:
 * Requires verified identity and explicit Admin privileges.
 * Fails closed: if user identity is absent or unverified, request is rejected.
 */

import {
  Controller,
  Post,
  Body,
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
  SmartAllocationService,
  OptimizeRequest,
  CommitRequest,
} from './smart-allocation.service';

/**
 * Strict Admin Guard for EF-02.
 * Fails closed: Requires upstream verification (req.user attached by M2's JwtAuthGuard)
 * AND verifies explicit admin role claim.
 */
@Injectable()
export class ExtensionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    
    // 1. Verify that upstream M2 JwtAuthGuard ran and authenticated user identity
    if (!req.user) {
      throw new UnauthorizedException(
        'Authentication required: Missing authenticated user context. Ensure M2 JwtAuthGuard is loaded upstream.'
      );
    }

    // 2. Enforce explicit Admin role
    const role = req.user.role ? String(req.user.role).toUpperCase() : '';
    if (role !== 'ADMIN') {
      throw new ForbiddenException('Admin role required for smart allocation operations.');
    }

    return true;
  }
}

@Controller('api/ext/EF-02')
@UseGuards(ExtensionAdminGuard)
export class SmartAllocationController {
  constructor(private readonly service: SmartAllocationService) {}

  private featureEnabled(): boolean {
    return process.env.FEATURE_EF_02 === 'on';
  }

  /**
   * POST /api/ext/EF-02/optimize
   * Body: { programmeId: number, policy?: string }
   * Returns a server-signed preview token and proposed allocations.
   * Nothing is persisted to the database.
   */
  @Post('optimize')
  async optimize(
    @Body() body: OptimizeRequest,
    @Res() res: Response,
  ) {
    if (!this.featureEnabled()) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'Feature EF-02 is disabled' });
    }
    if (!body?.programmeId) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'programmeId is required' });
    }

    try {
      const result = await this.service.optimize(body);
      return res.json(result);
    } catch (err: any) {
      const status = err.message?.startsWith('CONFIG_ERROR')
        ? HttpStatus.INTERNAL_SERVER_ERROR
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({ error: err.message || 'Optimization failed' });
    }
  }

  /**
   * POST /api/ext/EF-02/commit
   * Body: { programmeId: number, previewToken: string }
   * Validates the server-signed preview token and commits the validated allocations.
   * Caller-supplied proposals are ignored to prevent tampering.
   */
  @Post('commit')
  async commit(
    @Body() body: CommitRequest,
    @Res() res: Response,
  ) {
    if (!this.featureEnabled()) {
      return res
        .status(HttpStatus.FORBIDDEN)
        .json({ error: 'Feature EF-02 is disabled' });
    }
    if (!body?.programmeId || !body?.previewToken) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'programmeId and previewToken are required' });
    }

    try {
      const result = await this.service.commit(body);
      return res.json(result);
    } catch (err: any) {
      if (err.message === 'INVALID_TOKEN' || err.message === 'PROGRAMME_MISMATCH') {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ error: 'Invalid or forged preview token' });
      }
      if (err.message === 'PREVIEW_EXPIRED') {
        return res
          .status(HttpStatus.GONE)
          .json({ error: 'Preview has expired. Please run optimization again.' });
      }
      if (err.message?.startsWith('CONFIG_ERROR')) {
        return res
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json({ error: err.message });
      }
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || 'Commit failed' });
    }
  }
}


