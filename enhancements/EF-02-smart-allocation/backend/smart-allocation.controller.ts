/**
 * EF-02: Smart Allocation Engine – Controller
 * Owned by M3. Mounted via M2's extension hook under /api/ext/EF-02.
 * Returns 403 when FEATURE_EF_02 is not 'on'.
 */

import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  SmartAllocationService,
  OptimizeRequest,
  CommitRequest,
} from './smart-allocation.service';

// Stub guard – replaced by M2's real JwtAuthGuard at mount time
class AdminGuard {
  canActivate() { return true; }
}

@Controller('api/ext/EF-02')
@UseGuards(AdminGuard)
export class SmartAllocationController {
  constructor(private readonly service: SmartAllocationService) {}

  private featureEnabled(): boolean {
    return process.env.FEATURE_EF_02 === 'on';
  }

  /**
   * POST /api/ext/EF-02/optimize
   * Body: { programmeId: number, policy?: string }
   * Returns a proposed allocation preview. Nothing is persisted.
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
    const result = await this.service.optimize(body);
    return res.json(result);
  }

  /**
   * POST /api/ext/EF-02/commit
   * Body: { programmeId, previewToken, proposedAllocations }
   * Persists the reviewed allocation plan.
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
    if (!body?.programmeId || !body?.proposedAllocations) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'programmeId and proposedAllocations are required' });
    }
    const result = await this.service.commit(body);
    return res.json(result);
  }
}
