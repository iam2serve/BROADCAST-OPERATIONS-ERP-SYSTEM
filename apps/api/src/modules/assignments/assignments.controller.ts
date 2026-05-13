import { Body, Controller, Param, Patch, Post, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AssignmentsService } from './assignments.service.js';
import { AssignResourceDto, AssignmentResourceTypeDto, BulkAssignmentDto, ReassignResourceDto, ReleaseAssignmentDto } from './dto/assignment.dto.js';

@Controller('events/:eventId/assignments')
export class EventAssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post('operators')
  @Version('1')
  @RequirePermissions(permissions.assignmentsCreate)
  assignOperator(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string, @Body() dto: AssignResourceDto, @Req() request: Request) {
    return this.assignments.assignOperator(principal, eventId, dto, this.context(request));
  }

  @Post('devices')
  @Version('1')
  @RequirePermissions(permissions.assignmentsCreate)
  assignDevice(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string, @Body() dto: AssignResourceDto, @Req() request: Request) {
    return this.assignments.assignDevice(principal, eventId, dto, this.context(request));
  }

  @Post('sims')
  @Version('1')
  @RequirePermissions(permissions.assignmentsCreate)
  assignSim(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string, @Body() dto: AssignResourceDto, @Req() request: Request) {
    return this.assignments.assignSim(principal, eventId, dto, this.context(request));
  }

  @Post('routers')
  @Version('1')
  @RequirePermissions(permissions.assignmentsCreate)
  assignRouter(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string, @Body() dto: AssignResourceDto, @Req() request: Request) {
    return this.assignments.assignRouter(principal, eventId, dto, this.context(request));
  }

  @Post('bulk')
  @Version('1')
  @RequirePermissions(permissions.assignmentsBulk)
  bulk(@CurrentUser() principal: AuthenticatedPrincipal, @Param('eventId') eventId: string, @Body() dto: BulkAssignmentDto, @Req() request: Request) {
    return this.assignments.bulkAssign(principal, eventId, dto, this.context(request));
  }

  private context(request: Request) {
    return { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
  }
}

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Patch(':resourceType/:assignmentId/release')
  @Version('1')
  @RequirePermissions(permissions.assignmentsRelease)
  release(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('resourceType') resourceType: AssignmentResourceTypeDto,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReleaseAssignmentDto,
    @Req() request: Request,
  ) {
    return this.assignments.release(principal, resourceType, assignmentId, dto, this.context(request));
  }

  @Patch(':resourceType/:assignmentId/reassign')
  @Version('1')
  @RequirePermissions(permissions.assignmentsReassign)
  reassign(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('resourceType') resourceType: AssignmentResourceTypeDto,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReassignResourceDto,
    @Req() request: Request,
  ) {
    return this.assignments.reassign(principal, resourceType, assignmentId, dto, this.context(request));
  }

  private context(request: Request) {
    return { requestId: request.requestId, ipAddress: request.ip, userAgent: request.headers['user-agent'] };
  }
}
