import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

import { MaintenanceStatusDto } from '../../inventory/dto/inventory-common.dto.js';

export enum DeviceTypeDto {
  LIVEU = 'LIVEU',
  TVU = 'TVU',
  DEJERO = 'DEJERO',
  SRT = 'SRT',
  CUSTOM = 'CUSTOM',
}

export enum FirmwareStatusDto {
  UNKNOWN = 'UNKNOWN',
  UP_TO_DATE = 'UP_TO_DATE',
  UPDATE_AVAILABLE = 'UPDATE_AVAILABLE',
  OUTDATED = 'OUTDATED',
  FAILED = 'FAILED',
}

export class CreateDeviceDto {
  @IsString()
  @MinLength(2)
  serialNumber!: string;

  @IsString()
  @MinLength(2)
  alias!: string;

  @IsEnum(DeviceTypeDto)
  deviceType!: DeviceTypeDto;

  @IsOptional()
  @IsString()
  firmwareVersion?: string;

  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsOptional()
  @IsString()
  qrCodeIdentifier?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsDateString()
  warrantyExpiry?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatusDto)
  maintenanceStatus?: MaintenanceStatusDto;

  @IsOptional()
  @IsBoolean()
  supportsCellular?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsEthernet?: boolean;

  @IsOptional()
  @IsBoolean()
  supportsWifi?: boolean;

  @IsOptional()
  @IsString()
  credentials?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDeviceDto extends PartialType(CreateDeviceDto) {}

export class DeviceTelemetryDto {
  @IsOptional() @IsInt() signalRssi?: number;
  @IsOptional() @IsInt() signalRsrp?: number;
  @IsOptional() @IsInt() signalRsrq?: number;
  @IsOptional() @IsInt() signalSinr?: number;
  @IsOptional() @IsInt() batteryLevel?: number;
  @IsOptional() @IsEnum(FirmwareStatusDto) firmwareStatus?: FirmwareStatusDto;
}
