import { Body, Controller, Get, Param, Patch, Post, Query, Req, Version } from '@nestjs/common';
import type { Request } from 'express';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { CreateOperatorDto } from './dto/create-operator.dto.js';
import { ListOperatorsDto } from './dto/list-operators.dto.js';
import { UpdateOperatorDto } from './dto/update-operator.dto.js';
import { OperatorsService } from './operators.service.js';

@Controller('operators')
export class OperatorsController {
  constructor(private readonly operators: OperatorsService) {}

  @Get()
  @Version('1')
  @RequirePermissions(permissions.operatorsRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListOperatorsDto) {
    return this.operators.list(principal, query);
  }

  @Get(':id')
  @Version('1')
  @RequirePermissions(permissions.operatorsRead)
  getById(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.operators.getById(principal, id);
  }

  @Get(':id/availability')
  @Version('1')
  @RequirePermissions(permissions.operatorsAssign)
  availability(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) {
    return this.operators.availability(principal, id);
  }

  @Post()
  @Version('1')
  @RequirePermissions(permissions.operatorsCreate)
  create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CreateOperatorDto,
    @Req() request: Request,
  ) {
    return this.operators.create(principal, dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  @Patch(':id')
  @Version('1')
  @RequirePermissions(permissions.operatorsUpdate)
  update(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('id') id: string,
    @Body() dto: UpdateOperatorDto,
    @Req() request: Request,
  ) {
    return this.operators.update(principal, id, dto, {
      requestId: request.requestId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}
