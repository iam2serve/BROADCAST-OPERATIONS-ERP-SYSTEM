import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum OperatorStatusFilter {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ON_LEAVE = 'ON_LEAVE',
}

export class ListOperatorsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(OperatorStatusFilter)
  status?: OperatorStatusFilter;

  @IsOptional()
  @IsString()
  role?: string;
}
