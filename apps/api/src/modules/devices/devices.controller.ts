import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { CreateDeviceDto, DeviceTelemetryDto, UpdateDeviceDto } from './dto/device.dto.js';
import { DevicesService } from './devices.service.js';

@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Get() @Version('1') @RequirePermissions(permissions.devicesRead)
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: InventoryListDto) { return this.devices.list(principal, query); }

  @Get(':id') @Version('1') @RequirePermissions(permissions.devicesRead)
  get(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string) { return this.devices.get(principal, id); }

  @Post() @Version('1') @RequirePermissions(permissions.devicesCreate)
  create(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: CreateDeviceDto) { return this.devices.create(principal, dto); }

  @Patch(':id') @Version('1') @RequirePermissions(permissions.devicesUpdate)
  update(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateDeviceDto) { return this.devices.update(principal, id, dto); }

  @Patch(':id/status') @Version('1') @RequirePermissions(permissions.devicesManageStatus)
  updateStatus(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateStatusDto) { return this.devices.updateStatus(principal, id, dto); }

  @Post(':id/telemetry') @Version('1') @RequirePermissions(permissions.inventoryTelemetryIngest)
  ingestTelemetry(@CurrentUser() principal: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: DeviceTelemetryDto) { return this.devices.ingestTelemetry(principal, id, dto); }
}
