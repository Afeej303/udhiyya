import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';

export const kinds = [
  'registration',
  'participant',
  'animal',
  'allocation',
  'payment',
  'expense',
  'financial',
  'operations',
] as const;
export type ReportKind = (typeof kinds)[number];

export class ReportDates {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  to?: string;
}

export class ReportExportQuery extends ReportDates {
  @IsIn(['xlsx', 'pdf'])
  format!: 'xlsx' | 'pdf';
}

export class ReportQuery extends ProgrammeListQuery {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  from?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  to?: string;
}
