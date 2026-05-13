import { Body, Controller, Get, Param, Post, Query, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AssignmentResourceTypeDto } from '../assignments/dto/assignment.dto.js';
import { AvailabilityService } from './availability.service.js';
import { AvailabilitySearchDto, ConflictPreviewDto } from './dto/availability.dto.js';

@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get()
  @Version('1')
  @RequirePermissions(permissions.availabilityRead)
  search(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: AvailabilitySearchDto) {
    return this.availability.search(principal, query);
  }

  @Post('conflict-preview')
  @Version('1')
  @RequirePermissions(permissions.availabilityRead)
  preview(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: ConflictPreviewDto) {
    return this.availability.preview(principal, dto);
  }

  @Get(':resourceType/:resourceId')
  @Version('1')
  @RequirePermissions(permissions.availabilityRead)
  resourceAvailability(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('resourceType') resourceType: AssignmentResourceTypeDto,
    @Param('resourceId') resourceId: string,
    @Query() query: Omit<ConflictPreviewDto, 'resourceType' | 'resourceId'>,
  ) {
    return this.availability.preview(principal, {
      resourceType,
      resourceId,
      startsAt: query.startsAt,
      endsAt: query.endsAt,
      ...(query.eventId !== undefined ? { eventId: query.eventId } : {}),
    });
  }
}
