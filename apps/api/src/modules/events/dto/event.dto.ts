import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsEnum, IsHexColor, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

import { PaginationQueryDto } from '../../../common/pagination/pagination.dto.js';

export enum EventStatusDto {
  DRAFT = 'DRAFT',
  PLANNED = 'PLANNED',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export class ListEventsDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EventStatusDto)
  status?: EventStatusDto;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateEventDto {
  @IsString()
  name!: string;

  @IsString()
  clientName!: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsEnum(EventStatusDto)
  status?: EventStatusDto;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @IsHexColor()
  eventColor?: string;

  @IsOptional()
  @IsString()
  eventTag?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_080)
  cooldownBeforeMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_080)
  cooldownAfterMinutes?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  estimatedCrewSize?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateEventDto extends PartialType(CreateEventDto) {}

export class UpdateEventStatusDto {
  @IsEnum(EventStatusDto)
  status!: EventStatusDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
