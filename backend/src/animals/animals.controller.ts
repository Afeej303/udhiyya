import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import {
  AllocationQuery,
  CreateAnimalDto,
  CreateAnimalGroupDto,
  CreateShareAllocationDto,
  UpdateAnimalDto,
  UpdateAnimalGroupDto,
} from './animals.dto.js';
import { AnimalsService } from './animals.service.js';

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
export class AnimalsController {
  constructor(private readonly animals: AnimalsService) {}

  @Get('animals')
  animalsList(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.animals.listAnimals(scope(params), query);
  }

  @Get('animals/:id')
  animal(@Param() params: RecordParams) {
    return this.animals.getAnimal(scope(params), params.id);
  }

  @Post('animals')
  createAnimal(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAnimalDto,
  ) {
    return this.animals.createAnimal(scope(params), user.id, input);
  }

  @Patch('animals/:id')
  updateAnimal(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateAnimalDto,
  ) {
    return this.animals.updateAnimal(scope(params), params.id, user.id, input);
  }

  @Get('groups')
  groups(@Param() params: ProgrammeParams, @Query() query: ProgrammeListQuery) {
    return this.animals.listGroups(scope(params), query);
  }

  @Get('groups/:id')
  group(@Param() params: RecordParams) {
    return this.animals.getGroup(scope(params), params.id);
  }

  @Post('groups')
  createGroup(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateAnimalGroupDto,
  ) {
    return this.animals.createGroup(scope(params), user.id, input);
  }

  @Patch('groups/:id')
  updateGroup(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateAnimalGroupDto,
  ) {
    return this.animals.updateGroup(scope(params), params.id, user.id, input);
  }

  @Get('share-allocations')
  allocations(
    @Param() params: ProgrammeParams,
    @Query() query: AllocationQuery,
  ) {
    return this.animals.listAllocations(scope(params), query);
  }

  @Post('share-allocations')
  allocate(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateShareAllocationDto,
  ) {
    return this.animals.allocate(scope(params), user.id, input);
  }

  @Delete('share-allocations/:id')
  @HttpCode(204)
  release(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.animals.release(scope(params), params.id, user.id);
  }
}
