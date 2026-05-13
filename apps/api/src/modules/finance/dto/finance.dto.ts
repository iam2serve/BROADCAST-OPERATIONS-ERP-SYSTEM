import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum FinancialLockTypeDto {
  EVENT = 'EVENT',
  PAYROLL_PERIOD = 'PAYROLL_PERIOD',
}

export class LedgerQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  accountCode?: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class EventProfitabilityDto {
  @IsString()
  eventId!: string;
}

export class CreateFinancialLockDto {
  @IsEnum(FinancialLockTypeDto)
  lockType!: FinancialLockTypeDto;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  payrollPeriodId?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FinancialSummaryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
