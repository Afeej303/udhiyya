import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { OWNER_SCOPED_PROGRAMME_ROUTE } from '../common/constants/auth.constants.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import {
  BeneficiaryAccessDto,
  BeneficiaryDto,
  CollectionWindowDto,
  DistributionAllocationDto,
  DistributionPolicyDto,
  DistributionQuery,
  EligibilityDto,
  HandoffDto,
  TransitionAllocationDto,
  UpdateBeneficiaryDto,
  UpdateCollectionWindowDto,
} from './distribution.dto.js';
import { DistributionService } from './distribution.service.js';

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
export class CommitteeDistributionController {
  constructor(private readonly distribution: DistributionService) {}

  @Get('beneficiaries')
  beneficiaries(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.distribution.beneficiaries(scope(params), query);
  }

  @Post('beneficiaries')
  createBeneficiary(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: BeneficiaryDto,
  ) {
    return this.distribution.createBeneficiary(scope(params), actor.id, input);
  }

  @Get('beneficiaries/:id')
  getBeneficiary(@Param() params: RecordParams) {
    return this.distribution.getBeneficiary(scope(params), params.id);
  }

  @Patch('beneficiaries/:id')
  updateBeneficiary(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: UpdateBeneficiaryDto,
  ) {
    return this.distribution.updateBeneficiary(
      scope(params),
      params.id,
      actor.id,
      input,
    );
  }

  @Post('beneficiaries/:id/eligibility')
  @HttpCode(200)
  eligibility(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: EligibilityDto,
  ) {
    return this.distribution.eligibility(
      scope(params),
      params.id,
      actor.id,
      input,
    );
  }

  @Post('beneficiaries/:id/access')
  @HttpCode(201)
  issueAccess(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.distribution.issueAccess(scope(params), params.id, actor.id);
  }

  @Get('distribution/policy')
  policy(@Param() params: ProgrammeParams) {
    return this.distribution.policy(scope(params));
  }

  @Put('distribution/policy')
  savePolicy(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: DistributionPolicyDto,
  ) {
    return this.distribution.savePolicy(scope(params), actor.id, input);
  }

  @Get('distribution/inventory')
  inventory(@Param() params: ProgrammeParams) {
    return this.distribution.inventory(scope(params));
  }

  @Get('distribution/allocations')
  allocations(
    @Param() params: ProgrammeParams,
    @Query() query: DistributionQuery,
  ) {
    return this.distribution.allocations(scope(params), query);
  }

  @Post('distribution/allocations')
  createAllocation(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: DistributionAllocationDto,
  ) {
    return this.distribution.createAllocation(scope(params), actor.id, input);
  }

  @Post('distribution/allocations/:id/transition')
  @HttpCode(200)
  transition(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: TransitionAllocationDto,
  ) {
    return this.distribution.transition(
      scope(params),
      params.id,
      actor.id,
      input,
    );
  }

  @Get('distribution/collection-windows')
  windows(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.distribution.windows(scope(params), query);
  }

  @Post('distribution/collection-windows')
  createWindow(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: CollectionWindowDto,
  ) {
    return this.distribution.createWindow(scope(params), actor.id, input);
  }

  @Patch('distribution/collection-windows/:id')
  updateWindow(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: UpdateCollectionWindowDto,
  ) {
    return this.distribution.updateWindow(
      scope(params),
      params.id,
      actor.id,
      input,
    );
  }
}

@Controller('organisations/:orgId/programmes/:programmeId')
@SetMetadata(OWNER_SCOPED_PROGRAMME_ROUTE, true)
export class RecipientDistributionController {
  constructor(private readonly distribution: DistributionService) {}

  @Post('me/beneficiary-access/accept')
  @HttpCode(200)
  acceptAccess(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: BeneficiaryAccessDto,
  ) {
    return this.distribution.acceptAccess(scope(params), actor, input.token);
  }

  @Get('me/beneficiary')
  ownBeneficiary(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.distribution.ownBeneficiary(scope(params), actor.id);
  }

  @Get('me/beneficiary/distribution')
  ownDistribution(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.distribution.ownDistribution(scope(params), actor.id);
  }

  @Get('volunteer/distribution/queue')
  queue(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.distribution.queue(scope(params), actor, query);
  }

  @Post('volunteer/distribution/allocations/:id/handoff')
  @HttpCode(200)
  handoff(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: HandoffDto,
  ) {
    return this.distribution.handoff(scope(params), params.id, actor, input);
  }
}

@Controller('public/organisations/:orgId/programmes/:year/distribution')
@Public()
export class PublicDistributionController {
  constructor(private readonly distribution: DistributionService) {}

  @Get()
  get(
    @Param('orgId', ParseUUIDPipe) organizationId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.distribution.publicDistribution(organizationId, year);
  }
}
