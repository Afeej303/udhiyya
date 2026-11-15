import { Type } from 'class-transformer';
import {
  Equals,
  IsEmail,
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
  ValidateNested,
} from 'class-validator';

export class CreateProgrammeDto {
  @IsInt()
  @Min(1900)
  @Max(9999)
  year!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;
}

export class ProgrammePriceDto {
  @IsInt()
  @Min(0)
  @Max(2147483647)
  amountMinor!: number;

  @Equals('INR')
  currency!: 'INR';
}

export class ProgrammeContactDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;
}

export class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10000)
  guidelines?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProgrammeContactDto)
  publicContact?: ProgrammeContactDto | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  registrationOpensAt?: string | null;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  registrationClosesAt?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(2147483647)
  registrationLimit?: number | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  price?: ProgrammePriceDto | null;
}

export class ProgrammeListQuery {
  @IsOptional()
  @IsUUID()
  cursor?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;
}
