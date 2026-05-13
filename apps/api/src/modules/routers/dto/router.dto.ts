import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsIP, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

import { MaintenanceStatusDto } from '../../inventory/dto/inventory-common.dto.js';

export class CreateRouterDto {
  @IsString() @MinLength(5) imei!: string;
  @IsString() brand!: string;
  @IsString() model!: string;
  @IsOptional() @IsIP() lanIp?: string;
  @IsOptional() @IsString() wifiSsid?: string;
  @IsOptional() @IsString() wifiPassword?: string;
  @IsOptional() @IsString() assetTag?: string;
  @IsOptional() @IsString() qrCodeIdentifier?: string;
  @IsOptional() @IsString() vendor?: string;
  @IsOptional() @IsDateString() warrantyExpiry?: string;
  @IsOptional() @IsEnum(MaintenanceStatusDto) maintenanceStatus?: MaintenanceStatusDto;
  @IsOptional() @IsUUID() currentSimId?: string;
}

export class UpdateRouterDto extends PartialType(CreateRouterDto) {}
