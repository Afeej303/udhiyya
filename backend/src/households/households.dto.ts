import { Type } from 'class-transformer';
import {
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PlatformOrganisationQuery } from '../platform/platform-organisations.dto.js';

export class HouseholdContactDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone?: string;
}

export class CreateHouseholdDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  address!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => HouseholdContactDto)
  contact!: HouseholdContactDto;
}

export class UpdateHouseholdDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  address?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => HouseholdContactDto)
  contact?: HouseholdContactDto;
}

export class HouseholdQuery extends PlatformOrganisationQuery {}
