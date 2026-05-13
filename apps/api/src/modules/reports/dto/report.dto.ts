import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum ReportTypeDto {
  EVENT_PROFITABILITY = 'EVENT_PROFITABILITY',
  OPERATOR_PAYOUTS = 'OPERATOR_PAYOUTS',
  SIM_UTILIZATION = 'SIM_UTILIZATION',
  DEVICE_UTILIZATION = 'DEVICE_UTILIZATION',
  ASSIGNMENT_HISTORY = 'ASSIGNMENT_HISTORY',
  EXPENSE_BREAKDOWN = 'EXPENSE_BREAKDOWN',
  PAYROLL_SUMMARY = 'PAYROLL_SUMMARY',
}

export enum ReportExportFormatDto {
  JSON = 'JSON',
  CSV = 'CSV',
  PDF = 'PDF',
}

export class GenerateReportDto {
  @IsEnum(ReportTypeDto)
  reportType!: ReportTypeDto;

  @IsOptional()
  @IsEnum(ReportExportFormatDto)
  exportFormat?: ReportExportFormatDto;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class ListReportsDto extends PaginationQueryDto {}
