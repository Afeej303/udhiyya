import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { CreateHouseholdDto } from '../households/households.dto.js';
import {
  RegistrationDecisionDto,
  RegistrationQuery,
  ReplaceOptionsDto,
  SubmitRegistrationDto,
} from './registration.dto.js';
import { RegistrationService } from './registration.service.js';
import { OWNER_SCOPED_PROGRAMME_ROUTE } from '../common/constants/auth.constants.js';

class ProgrammeParams {
  @IsUUID()
  orgId!: string;

  @IsUUID()
  programmeId!: string;
}

class RegistrationParams extends ProgrammeParams {
  @IsUUID()
  registrationId!: string;
}

function scope(params: ProgrammeParams) {
  return { organizationId: params.orgId, programmeId: params.programmeId };
}

@Controller('organisations/:orgId/programmes/:programmeId')
@Roles('org_admin', 'org_owner')
export class CommitteeRegistrationController {
  constructor(private readonly registrations: RegistrationService) {}

  @Get('participation-options')
  options(@Param() params: ProgrammeParams) {
    return this.registrations.options(scope(params), false);
  }

  @Put('participation-options')
  replaceOptions(
    @Param() params: ProgrammeParams,
    @Body() input: ReplaceOptionsDto,
  ) {
    return this.registrations.replaceOptions(scope(params), input);
  }

  @Get('registrations')
  list(@Param() params: ProgrammeParams, @Query() query: RegistrationQuery) {
    return this.registrations.list(scope(params), query);
  }

  @Get('registrations/:registrationId')
  get(@Param() params: RegistrationParams) {
    return this.registrations.get(scope(params), params.registrationId);
  }

  @Post('registrations/:registrationId/decision')
  @HttpCode(200)
  decide(
    @Param() params: RegistrationParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: RegistrationDecisionDto,
  ) {
    return this.registrations.decide(
      scope(params),
      params.registrationId,
      user.id,
      input,
    );
  }
}

@Controller('organisations/:orgId/programmes/:programmeId/me')
@SetMetadata(OWNER_SCOPED_PROGRAMME_ROUTE, true)
export class ApplicantRegistrationController {
  constructor(private readonly registrations: RegistrationService) {}

  @Get('participation-options')
  options(@Param() params: ProgrammeParams) {
    return this.registrations.options(scope(params), true);
  }

  @Get('household')
  ownHousehold(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrations.ownHousehold(scope(params), user.id);
  }

  @Put('household')
  saveHousehold(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateHouseholdDto,
  ) {
    return this.registrations.saveHousehold(scope(params), user.id, input);
  }

  @Post('registration')
  submit(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: SubmitRegistrationDto,
  ) {
    return this.registrations.submit(scope(params), user.id, input);
  }

  @Get('registration')
  ownRegistration(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.registrations.getOwn(scope(params), user.id);
  }

  @Get('participation')
  async ownParticipation(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const registration = await this.registrations.getOwn(
      scope(params),
      user.id,
    );
    return {
      registration,
      assignment: null,
      operations: null,
      distribution: null,
    };
  }
}
