import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsISO8601,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  ProgrammeListQuery,
  ProgrammePriceDto,
} from '../programmes/programmes.dto.js';

export class PaymentQuery extends ProgrammeListQuery {
  @IsOptional()
  @IsUUID()
  registrationId?: string;

  @IsOptional()
  @IsIn(['pending', 'verified', 'rejected'])
  status?: 'pending' | 'verified' | 'rejected';
}

export class CreatePaymentDto {
  @IsUUID()
  registrationId!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  amount!: ProgrammePriceDto;

  @IsIn(['cash', 'upi', 'bank_transfer', 'other'])
  method!: 'cash' | 'upi' | 'bank_transfer' | 'other';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reference?: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  receivedAt!: string;
}

export class VerifyPaymentDto {
  @IsIn(['verify', 'reject'])
  action!: 'verify' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class ExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;
}

export class ExpenseDto {
  @IsUUID()
  categoryId!: string;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ProgrammePriceDto)
  amount!: ProgrammePriceDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  incurredAt!: string;
}

export class UpdateExpenseDto extends PartialType(ExpenseDto) {}
