import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class MessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  body!: string;
}

export class NotificationDto extends MessageDto {
  @IsIn(['participants', 'beneficiaries', 'volunteers', 'all'])
  audience!: 'participants' | 'beneficiaries' | 'volunteers' | 'all';

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(2)
  @ArrayUnique()
  @IsIn(['in_app', 'email'], { each: true })
  channels!: ('in_app' | 'email')[];
}

export class MarkNotificationDto {
  @Equals(true)
  read!: true;
}

export class EnquiryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @MaxLength(254)
  replyEmail!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  message!: string;
}
