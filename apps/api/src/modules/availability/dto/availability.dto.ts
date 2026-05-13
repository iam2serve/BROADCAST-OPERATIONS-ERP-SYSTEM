import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

import { AssignmentResourceTypeDto } from '../../assignments/dto/assignment.dto.js';

export class AvailabilitySearchDto {
  @IsEnum(AssignmentResourceTypeDto)
  resourceType!: AssignmentResourceTypeDto;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

export class ConflictPreviewDto {
  @IsEnum(AssignmentResourceTypeDto)
  resourceType!: AssignmentResourceTypeDto;

  @IsString()
  resourceId!: string;

  @IsDateString()
  startsAt!: string;

  @IsDateString()
  endsAt!: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}
