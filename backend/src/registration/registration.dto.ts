import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDefined,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PlatformOrganisationQuery } from '../platform/platform-organisations.dto.js';
import { ProgrammePriceDto } from '../programmes/programmes.dto.js';

export class SubmitRegistrationDto {
  @IsUUID()
  optionId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  shares!: number;
}

export class RegistrationQuery extends PlatformOrganisationQuery {
  @IsOptional()
  @IsIn(['submitted', 'approved', 'rejected', 'cancelled'])
  status?: 'submitted' | 'approved' | 'rejected' | 'cancelled';
}

export class RegistrationDecisionDto {
  @IsIn(['approve', 'reject', 'cancel'])
  action!: 'approve' | 'reject' | 'cancel';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

class ParticipationOptionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  price!: ProgrammePriceDto;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  maxShares!: number;
}

export class ReplaceOptionsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => ParticipationOptionDto)
  items!: ParticipationOptionDto[];
}
