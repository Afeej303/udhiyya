import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  SetMetadata,
} from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { OWNER_SCOPED_PROGRAMME_ROUTE } from '../common/constants/auth.constants.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import {
  CashSubmissionDto,
  CreateIssueDto,
  CreateScheduleDto,
  CreateTaskDto,
  CreateVolunteerDto,
  OperationProgressDto,
  OperationsQuery,
  TaskProgressDto,
  UpdateIssueDto,
  UpdateScheduleDto,
  UpdateTaskDto,
  UpdateVolunteerDto,
} from './operations.dto.js';
import { OperationsService } from './operations.service.js';

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
export class CommitteeOperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('volunteers')
  getVolunteers(
    @Param() params: ProgrammeParams,
    @Query() query: ProgrammeListQuery,
  ) {
    return this.operations.volunteers(scope(params), query);
  }

  @Post('volunteers')
  postVolunteers(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateVolunteerDto,
  ) {
    return this.operations.createVolunteer(scope(params), user.id, input);
  }

  @Patch('volunteers/:id')
  patchVolunteers(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateVolunteerDto,
  ) {
    return this.operations.updateVolunteer(
      scope(params),
      params.id,
      user.id,
      input,
    );
  }

  @Get('tasks')
  getTasks(@Param() params: ProgrammeParams, @Query() query: OperationsQuery) {
    return this.operations.listTasks(scope(params), query);
  }

  @Post('tasks')
  postTasks(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateTaskDto,
  ) {
    return this.operations.createTask(scope(params), user.id, input);
  }

  @Patch('tasks/:id')
  patchTasks(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateTaskDto,
  ) {
    return this.operations.updateTask(scope(params), params.id, user.id, input);
  }

  @Get('schedules')
  getSchedules(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
  ) {
    return this.operations.listSchedules(scope(params), query);
  }

  @Post('schedules')
  postSchedules(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateScheduleDto,
  ) {
    return this.operations.createSchedule(scope(params), user.id, input);
  }

  @Patch('schedules/:id')
  patchSchedules(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateScheduleDto,
  ) {
    return this.operations.updateSchedule(
      scope(params),
      params.id,
      user.id,
      input,
    );
  }

  @Get('operations')
  getOperations(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
  ) {
    return this.operations.listSchedules(scope(params), query, undefined, true);
  }

  @Get('issues')
  getIssues(@Param() params: ProgrammeParams, @Query() query: OperationsQuery) {
    return this.operations.issues(scope(params), query);
  }

  @Patch('issues/:id')
  patchIssues(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: UpdateIssueDto,
  ) {
    return this.operations.updateIssue(
      scope(params),
      params.id,
      user.id,
      input,
    );
  }
}

@Controller('organisations/:orgId/programmes/:programmeId/volunteer')
@SetMetadata(OWNER_SCOPED_PROGRAMME_ROUTE, true)
export class VolunteerOperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Get('workspace')
  getWorkspace(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.workspace(scope(params), user);
  }

  @Get('tasks')
  getTasks(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.listTasks(scope(params), query, user);
  }

  @Get('schedules')
  getSchedules(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.listSchedules(scope(params), query, user);
  }

  @Get('operations')
  getOperations(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.listSchedules(scope(params), query, user, true);
  }

  @Get('collections')
  getCollections(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.collections(scope(params), query, user);
  }

  @Post('tasks/:id/progress')
  @HttpCode(200)
  postTasksProgress(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: TaskProgressDto,
  ) {
    return this.operations.taskProgress(scope(params), params.id, user, input);
  }

  @Post('operations/:id/progress')
  @HttpCode(200)
  postOperationsProgress(
    @Param() params: RecordParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: OperationProgressDto,
  ) {
    return this.operations.operationProgress(
      scope(params),
      params.id,
      user,
      input,
    );
  }

  @Get('issues')
  getIssues(
    @Param() params: ProgrammeParams,
    @Query() query: OperationsQuery,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operations.issues(scope(params), query, user);
  }

  @Post('issues')
  postIssues(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CreateIssueDto,
  ) {
    return this.operations.createIssue(scope(params), user, input);
  }

  @Post('cash-submissions')
  postCashSubmissions(
    @Param() params: ProgrammeParams,
    @CurrentUser() user: AuthenticatedUser,
    @Body() input: CashSubmissionDto,
  ) {
    return this.operations.submitCash(scope(params), user, input);
  }
}
