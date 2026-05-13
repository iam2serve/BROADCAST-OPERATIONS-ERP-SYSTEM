import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum SalaryTypeDto {
  DAILY = 'DAILY',
  EVENT = 'EVENT',
  MONTHLY = 'MONTHLY',
  HYBRID = 'HYBRID',
}

export enum PayrollAdjustmentTypeDto {
  ADVANCE = 'ADVANCE',
  DEDUCTION = 'DEDUCTION',
  OVERTIME = 'OVERTIME',
  BONUS = 'BONUS',
}

export class CreateSalaryProfileDto {
  @IsString()
  operatorId!: string;

  @IsEnum(SalaryTypeDto)
  salaryType!: SalaryTypeDto;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  dailyRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  eventRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  monthlyRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  overtimeRate?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsDateString()
  effectiveFrom!: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSalaryProfileDto extends PartialType(CreateSalaryProfileDto) {}

export class CreatePayrollPeriodDto {
  @IsString()
  name!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;
}

export class CreatePayoutDto {
  @IsString()
  payrollPeriodId!: string;

  @IsString()
  operatorId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreatePayrollAdjustmentDto {
  @IsOptional()
  @IsString()
  payrollPeriodId?: string;

  @IsString()
  operatorId!: string;

  @IsEnum(PayrollAdjustmentTypeDto)
  type!: PayrollAdjustmentTypeDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ListPayrollDto extends PaginationQueryDto {}
