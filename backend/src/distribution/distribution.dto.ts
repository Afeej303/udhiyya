import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsIn,
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

export class BeneficiaryDto {
  @IsUUID()
  householdId!: string;
}
export class UpdateBeneficiaryDto extends PartialType(BeneficiaryDto) {}

export class EligibilityDto {
  @IsIn(['approve', 'reject'])
  action!: 'approve' | 'reject';

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}

export class BeneficiaryAccessDto {
  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  token!: string;
}

class ParticipantPolicyDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  gramsPerShare!: number;
}

class PublicPolicyDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(2147483647)
  gramsPerHousehold!: number;

  @IsString()
  @MaxLength(5000)
  guidance!: string;
}

export class DistributionPolicyDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => ParticipantPolicyDto)
  participant!: ParticipantPolicyDto;

  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => PublicPolicyDto)
  public!: PublicPolicyDto;
}

export class CollectionWindowDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(300)
  location!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  startsAt!: string;

  @IsISO8601({ strict: true })
  @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/)
  endsAt!: string;

  @IsString()
  @MaxLength(3000)
  instructions!: string;
}
export class UpdateCollectionWindowDto extends PartialType(
  CollectionWindowDto,
) {}

export class DistributionAllocationDto {
  @IsIn(['participant', 'beneficiary'])
  recipientType!: 'participant' | 'beneficiary';

  @IsUUID()
  recipientId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483647)
  quantityGrams!: number;

  @IsUUID()
  collectionWindowId!: string;
}

export class DistributionQuery extends ProgrammeListQuery {
  @IsOptional()
  @IsIn(['draft', 'confirmed', 'packed', 'collected', 'delivered', 'cancelled'])
  status?:
    'draft' | 'confirmed' | 'packed' | 'collected' | 'delivered' | 'cancelled';
}

export class TransitionAllocationDto {
  @IsIn(['confirm', 'pack', 'cancel'])
  action!: 'confirm' | 'pack' | 'cancel';
}

export class HandoffDto {
  @IsIn(['collected', 'delivered'])
  outcome!: 'collected' | 'delivered';

  @IsUUID()
  recipientProof!: string;
}
