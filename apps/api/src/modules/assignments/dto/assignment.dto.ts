import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDateString, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum AssignmentResourceTypeDto {
  OPERATOR = 'OPERATOR',
  DEVICE = 'DEVICE',
  SIM = 'SIM',
  ROUTER = 'ROUTER',
}

export enum AssignmentStatusDto {
  RESERVED = 'RESERVED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export class AssignResourceDto {
  @IsString()
  resourceId!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsEnum(AssignmentStatusDto)
  status?: AssignmentStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkAssignmentItemDto extends AssignResourceDto {
  @IsEnum(AssignmentResourceTypeDto)
  resourceType!: AssignmentResourceTypeDto;
}

export class BulkAssignmentDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => BulkAssignmentItemDto)
  assignments!: BulkAssignmentItemDto[];
}

export class ReassignResourceDto {
  @IsString()
  newResourceId!: string;

  @IsOptional()
  @IsDateString()
  startsAt?: string;

  @IsOptional()
  @IsDateString()
  endsAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleaseAssignmentDto {
  @IsOptional()
  @IsEnum(AssignmentStatusDto)
  status?: AssignmentStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
