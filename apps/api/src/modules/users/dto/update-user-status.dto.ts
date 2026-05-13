import { IsEnum } from 'class-validator';

export enum UpdateUserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PASSWORD_RESET_REQUIRED = 'PASSWORD_RESET_REQUIRED',
}

export class UpdateUserStatusDto {
  @IsEnum(UpdateUserStatus)
  status!: UpdateUserStatus;
}
