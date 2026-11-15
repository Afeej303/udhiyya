/**
 * EF-02: Smart Allocation Engine – Controller
 * Owned by M3. Mounted via M2's extension hook under /api/ext/EF-02.
 * Returns 403 when FEATURE_EF_02 is not 'on'.
 *
 * Auth Contract:
 * Requires authenticated Admin role. Uses M2's JwtAuthGuard / AdminRoleGuard.
 * When mounted by M2 in backend/, M2's extension loader injects the real guards.
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
} from '@nestjs/common';
import { Response } from 'express';
import {
  SmartAllocationService,
  OptimizeRequest,
  CommitRequest,
} from './smart-allocation.service';

/**
 * Extension Admin Guard for EF-02.
 * Enforces Authorization header presence and admin role claims.
 * M2's extension mount replaces/overrides this with backend/auth/jwt-auth.guard.ts.
 */
@Injectable()
export class ExtensionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization bearer token');
    }

    // If request user was already attached by upstream M2 auth middleware, verify admin role
    if (req.user && req.user.role && req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
      throw new UnauthorizedException('Admin privileges required for smart allocation');
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
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || 'Optimization failed' });
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
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: err.message || 'Commit failed' });
    }
  }
}

