import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum AutomationTriggerTypeDto {
  SIM_PACKAGE_EXPIRY = 'SIM_PACKAGE_EXPIRY',
  EVENT_STARTING_SOON = 'EVENT_STARTING_SOON',
  DEVICE_OFFLINE = 'DEVICE_OFFLINE',
  EXPENSE_PENDING_TOO_LONG = 'EXPENSE_PENDING_TOO_LONG',
  ASSIGNMENT_CONFLICT = 'ASSIGNMENT_CONFLICT',
  OVERDUE_REIMBURSEMENT = 'OVERDUE_REIMBURSEMENT',
  SCHEDULED = 'SCHEDULED',
}

export class ListAutomationRulesDto extends PaginationQueryDto {}

export class CreateAutomationRuleDto {
  @IsString()
  name!: string;

  @IsEnum(AutomationTriggerTypeDto)
  triggerType!: AutomationTriggerTypeDto;

  @IsOptional()
  @IsString()
  scheduleCron?: string;

  @IsOptional()
  @IsDateString()
  nextRunAt?: string;
}

export class ExecuteAutomationDto {
  @IsOptional()
  @IsString()
  entityId?: string;
}
