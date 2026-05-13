import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum NotificationChannelDto {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  PUSH = 'PUSH',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
}

export class ListNotificationsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  unread?: string;
}

export class DispatchNotificationDto {
  @IsArray()
  @IsString({ each: true })
  userIds!: string[];

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsString()
  type!: string;

  @IsOptional()
  @IsEnum(NotificationChannelDto)
  channel?: NotificationChannelDto;
}

export class BulkMarkReadDto {
  @IsArray()
  @IsString({ each: true })
  notificationIds!: string[];
}
