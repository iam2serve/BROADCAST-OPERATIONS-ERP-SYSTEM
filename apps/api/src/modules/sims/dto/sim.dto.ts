import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';

export enum CarrierDto {
  VODAFONE = 'VODAFONE',
  ORANGE = 'ORANGE',
  ETISALAT = 'ETISALAT',
  WE = 'WE',
}

export class CreateSimDto {
  @IsString() @MinLength(2) phoneNumber!: string;
  @IsString() @MinLength(8) iccid!: string;
  @IsOptional() @IsString() imsi?: string;
  @IsEnum(CarrierDto) carrier!: CarrierDto;
  @IsOptional() @IsString() packageType?: string;
  @IsOptional() @IsDateString() packageRenewalDate?: string;
  @IsOptional() @IsString() mainControllingNumber?: string;
  @IsOptional() @IsString() apn?: string;
  @IsOptional() @IsString() assetTag?: string;
  @IsOptional() @IsString() qrCodeIdentifier?: string;
  @IsOptional() @IsString() credentials?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateSimDto extends PartialType(CreateSimDto) {}

export class SimPackageRechargeDto {
  @IsDateString() rechargeDate!: string;
  @IsString() packageType!: string;
  @IsNumber() @Min(0) amount!: number;
  @IsDateString() expiryDate!: string;
  @IsOptional() @IsString() notes?: string;
}
