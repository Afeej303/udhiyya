import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsDefined,
  IsObject,
  ValidateNested,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  ProgrammeListQuery,
  ProgrammePriceDto,
} from '../programmes/programmes.dto.js';

export const departments = [
  'slaughter',
  'processing',
  'distribution',
  'finance',
] as const;
export const workStates = ['pending', 'in_progress', 'completed'] as const;
export const processingStages = ['cutting', 'weighing', 'packaging'] as const;

type Department = (typeof departments)[number];
type WorkState = (typeof workStates)[number];
type ProcessingStage = (typeof processingStages)[number];

export class CreateVolunteerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(departments, { each: true })
  departments!: Department[];
}

export class UpdateVolunteerDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @ArrayUnique()
  @IsIn(departments, { each: true })
  departments?: Department[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateScheduleDto {
  @IsIn(departments)
  department!: Department;

  @IsOptional()
  @IsUUID()
  animalId?: string | null;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  startsAt!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  endsAt!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  location!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  teamMemberIds!: string[];
}

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {}

export class CreateTaskDto {
  @IsIn(departments)
  department!: Department;

  @IsUUID()
  assigneeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsUUID()
  scheduleId?: string | null;

  @IsOptional()
  @IsUUID()
  resourceId?: string | null;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}

export class TaskProgressDto {
  @IsIn(workStates)
  status!: WorkState;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class OperationProgressDto {
  @IsIn(workStates)
  status!: WorkState;

  @IsOptional()
  @IsIn(processingStages)
  stage?: ProcessingStage;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  measuredGrams?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2147483647)
  packageCount?: number;
}

export class CreateIssueDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsOptional()
  @IsUUID()
  operationId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description!: string;
}

export class UpdateIssueDto {
  @IsIn(['open', 'resolved'])
  status!: 'open' | 'resolved';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolution?: string;
}

export class OperationsQuery extends ProgrammeListQuery {
  @IsOptional()
  @IsIn(departments)
  department?: Department;

  @IsOptional()
  @IsIn([...workStates, 'open', 'resolved'])
  status?: WorkState | 'open' | 'resolved';
}

export class CashSubmissionDto {
  @IsUUID()
  assignmentId!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  amount!: ProgrammePriceDto;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  receivedAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;
}
