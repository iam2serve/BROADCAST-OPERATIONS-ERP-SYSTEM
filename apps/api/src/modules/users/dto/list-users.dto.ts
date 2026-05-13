import { IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum UserStatusFilter {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
}

export class ListUsersDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserStatusFilter)
  status?: UserStatusFilter;

  @IsOptional()
  @IsString()
  roleId?: string;
}
