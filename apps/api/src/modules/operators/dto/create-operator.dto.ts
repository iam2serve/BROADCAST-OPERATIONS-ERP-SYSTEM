import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export enum SalaryTypeDto {
  DAILY = 'DAILY',
  EVENT = 'EVENT',
  MONTHLY = 'MONTHLY',
  HYBRID = 'HYBRID',
}

export class CreateOperatorDto {
  @IsUUID()
  userId!: string;

  @IsOptional()
  @IsString()
  nationalId?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MinLength(2)
  role!: string;

  @IsEnum(SalaryTypeDto)
  salaryType!: SalaryTypeDto;

  @IsOptional()
  @IsNumber()
  @Min(0)
  dailyRate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  eventRate?: number;

  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
