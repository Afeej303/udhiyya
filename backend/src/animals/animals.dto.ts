import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ProgrammeListQuery } from '../programmes/programmes.dto.js';
import { ProgrammePriceDto } from '../programmes/programmes.dto.js';

export class CreateAnimalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  reference!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  shareCapacity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierName?: string | null;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  procurementCost?: ProgrammePriceDto | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  procuredAt?: string | null;
}

export class UpdateAnimalDto extends PartialType(CreateAnimalDto) {}

export class CreateAnimalGroupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsUUID()
  animalId!: string;
}

export class UpdateAnimalGroupDto extends PartialType(CreateAnimalGroupDto) {}

export class CreateShareAllocationDto {
  @IsUUID()
  registrationId!: string;

  @IsUUID()
  groupId!: string;

  @IsDefined()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  shares!: number;
}

export class AllocationQuery extends ProgrammeListQuery {
  @IsOptional()
  @IsUUID()
  registrationId?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
