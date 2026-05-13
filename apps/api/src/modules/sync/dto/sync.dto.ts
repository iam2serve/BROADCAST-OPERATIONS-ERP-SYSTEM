import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum SyncResolutionDto {
  SERVER_WINS = 'SERVER_WINS',
  CLIENT_RETRY = 'CLIENT_RETRY',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  MERGE_SAFE_FIELDS = 'MERGE_SAFE_FIELDS',
}

export class SyncMutationDto {
  @IsString()
  clientMutationId!: string;

  @IsString()
  entityType!: string;

  @IsString()
  entityId!: string;

  @IsString()
  operation!: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsDateString()
  baseVersion?: string;
}

export class PushMutationsDto {
  @IsString()
  clientId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncMutationDto)
  mutations!: SyncMutationDto[];
}

export class PullUpdatesDto {
  @IsOptional()
  @IsDateString()
  since?: string;
}

export class ResolveConflictDto {
  @IsEnum(SyncResolutionDto)
  resolution!: SyncResolutionDto;

  @IsOptional()
  @IsObject()
  mergedPayload?: Record<string, unknown>;
}
