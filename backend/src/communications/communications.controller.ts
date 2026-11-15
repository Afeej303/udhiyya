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
  Query,
  SetMetadata,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsUUID } from 'class-validator';
import { OWNER_SCOPED_PROGRAMME_ROUTE } from '../common/constants/auth.constants.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import {
  EnquiryDto,
  MarkNotificationDto,
  MessageDto,
  NotificationDto,
} from './communications.dto.js';
import { CommunicationsService } from './communications.service.js';

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
export class CommitteeCommunicationsController {
  constructor(private readonly communication: CommunicationsService) {}

  @Get('announcements')
  announcements(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.communication.committeeAnnouncements(scope(params), query);
  }

  @Post('announcements')
  createAnnouncement(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: MessageDto,
  ) {
    return this.communication.createAnnouncement(
      scope(params),
      actor.id,
      input,
    );
  }

  @Post('announcements/:id/publish')
  @HttpCode(200)
  publishAnnouncement(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.communication.publishAnnouncement(
      scope(params),
      params.id,
      actor.id,
    );
  }

  @Post('notifications')
  send(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() input: NotificationDto,
  ) {
    return this.communication.send(scope(params), actor.id, input);
  }

  @Get('enquiries')
  enquiries(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.communication.enquiries(scope(params), query);
  }
}

@Controller('organisations/:orgId/programmes/:programmeId/me/notifications')
@SetMetadata(OWNER_SCOPED_PROGRAMME_ROUTE, true)
export class InboxController {
  constructor(private readonly communication: CommunicationsService) {}

  @Get()
  inbox(
    @Param() params: ProgrammeParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.communication.inbox(scope(params), actor.id, query);
  }

  @Patch(':id')
  markRead(
    @Param() params: RecordParams,
    @CurrentUser() actor: AuthenticatedUser,
    @Body() _input: MarkNotificationDto,
  ) {
    return this.communication.markRead(scope(params), params.id, actor.id);
  }
}

@Controller('public/organisations/:orgId/programmes/:year')
@Public()
export class PublicCommunicationsController {
  constructor(private readonly communication: CommunicationsService) {}

  @Get('announcements')
  announcements(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('year', ParseIntPipe) year: number,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.communication.publicAnnouncements(orgId, year, query);
  }

  @Get('overview')
  overview(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.communication.publicOverview(orgId, year);
  }

  @Post('enquiries')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  addEnquiry(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('year', ParseIntPipe) year: number,
    @Body() input: EnquiryDto,
  ) {
    return this.communication.addEnquiry(orgId, year, input);
  }
}
