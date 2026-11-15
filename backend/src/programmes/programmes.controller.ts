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
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import {
  CreateProgrammeDto,
  ProgrammeListQuery,
  UpdateProgrammeDto,
} from './programmes.dto.js';
import { ProgrammesService } from './programmes.service.js';

@Controller('organisations/:orgId/programmes')
@Roles('org_admin', 'org_owner')
export class ProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @Get()
  list(
    @Param('orgId') organizationId: string,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.programmes.list(organizationId, query);
  }

  @Post()
  create(
    @Param('orgId') organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProgrammeDto,
  ) {
    return this.programmes.create(organizationId, user.id, dto);
  }

  @Get(':programmeId')
  get(
    @Param('orgId') organizationId: string,
    @Param('programmeId', ParseUUIDPipe) id: string,
  ) {
    return this.programmes.get(organizationId, id);
  }

  @Patch(':programmeId')
  update(
    @Param('orgId') organizationId: string,
    @Param('programmeId', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProgrammeDto,
  ) {
    return this.programmes.update(organizationId, id, user.id, dto);
  }

  @Post(':programmeId/publish')
  @HttpCode(200)
  publish(
    @Param('orgId') organizationId: string,
    @Param('programmeId', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programmes.publish(organizationId, id, user.id);
  }
  @Post(':programmeId/close')
  @HttpCode(200)
  close(
    @Param('orgId') organizationId: string,
    @Param('programmeId', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programmes.close(organizationId, id, user.id);
  }
}

@Controller('public/organisations/:orgId/programmes')
@Public()
export class PublicProgrammesController {
  constructor(private readonly programmes: ProgrammesService) {}

  @Get(':year')
  get(
    @Param('orgId', ParseUUIDPipe) organizationId: string,
    @Param('year', ParseIntPipe) year: number,
  ) {
    return this.programmes.getPublic(organizationId, year);
  }
}
