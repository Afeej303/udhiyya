import { Controller, Get, Param, Query } from '@nestjs/common';
import { IsIn, IsUUID } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  kinds,
  ReportExportQuery,
  ReportQuery,
  type ReportKind,
} from './reports.dto.js';
import { ReportsService } from './reports.service.js';

class ProgrammeParams {
  @IsUUID() orgId!: string;
  @IsUUID() programmeId!: string;
}

class ReportParams extends ProgrammeParams {
  @IsIn(kinds) kind!: ReportKind;
}

function scope(params: ProgrammeParams) {
  return { organizationId: params.orgId, programmeId: params.programmeId };
}

@Controller('organisations/:orgId/programmes/:programmeId')
@Roles('org_admin', 'org_owner')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('dashboard')
  dashboard(@Param() params: ProgrammeParams) {
    return this.reports.dashboard(scope(params));
  }

  @Get('reports/:kind')
  report(@Param() params: ReportParams, @Query() query: ReportQuery) {
    return this.reports.report(scope(params), params.kind, query);
  }

  @Get('reports/:kind/export')
  export(@Param() params: ReportParams, @Query() query: ReportExportQuery) {
    return this.reports.export(scope(params), params.kind, query);
  }
}
