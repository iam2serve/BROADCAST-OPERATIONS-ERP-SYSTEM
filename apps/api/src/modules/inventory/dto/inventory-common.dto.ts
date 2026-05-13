import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum ResourceStatusDto {
  AVAILABLE = 'AVAILABLE',
  ASSIGNED = 'ASSIGNED',
  MAINTENANCE = 'MAINTENANCE',
  LOST = 'LOST',
  RETIRED = 'RETIRED',
}

export enum MaintenanceStatusDto {
  OK = 'OK',
  DUE = 'DUE',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
}

export enum AssetTypeDto {
  DEVICE = 'DEVICE',
  SIM = 'SIM',
  ROUTER = 'ROUTER',
}

export class InventoryListDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ResourceStatusDto)
  status?: ResourceStatusDto;
}

export class UpdateStatusDto {
  @IsEnum(ResourceStatusDto)
  status!: ResourceStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class OwnershipTransferDto {
  @IsUUID()
  assignedToUserId!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnOwnershipDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class TelemetryIngestDto {
  @IsEnum(AssetTypeDto)
  assetType!: AssetTypeDto;

  @IsUUID()
  assetId!: string;

  @IsOptional()
  @IsDateString()
  measuredAt?: string;

  @IsOptional()
  @IsDateString()
  heartbeatAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  signalRssi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  signalRsrp?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  signalRsrq?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  signalSinr?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  batteryLevel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  uploadSpeedMbps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  downloadSpeedMbps?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  latencyMs?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  packetLossPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  bandwidthMbps?: number;

  @IsOptional()
  @IsString()
  source?: string;
}
