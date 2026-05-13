import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum ExpenseCategoryDto {
  FUEL = 'FUEL',
  FOOD = 'FOOD',
  HOTEL = 'HOTEL',
  TRANSPORTATION = 'TRANSPORTATION',
  INTERNET = 'INTERNET',
  SIM_RECHARGE = 'SIM_RECHARGE',
  REPAIR = 'REPAIR',
  EMERGENCY = 'EMERGENCY',
  MISC = 'MISC',
}

export enum ExpenseStatusDto {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  REIMBURSED = 'REIMBURSED',
}

export class ListExpensesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ExpenseStatusDto)
  status?: ExpenseStatusDto;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class CreateExpenseDto {
  @IsString()
  eventId!: string;

  @IsString()
  operatorId!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(ExpenseCategoryDto)
  category!: ExpenseCategoryDto;

  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachmentIds?: string[];
}

export class UpdateExpenseDto extends PartialType(CreateExpenseDto) {}

export class ReviewExpenseDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReimburseExpenseDto {
  @IsString()
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
