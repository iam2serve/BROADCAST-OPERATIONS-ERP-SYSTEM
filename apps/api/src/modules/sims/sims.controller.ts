import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { CreateSimDto, SimPackageRechargeDto, UpdateSimDto } from './dto/sim.dto.js';
import { SimsService } from './sims.service.js';

@Controller('sims')
export class SimsController {
  constructor(private readonly sims: SimsService) {}
  @Get() @Version('1') @RequirePermissions(permissions.simsRead) list(@CurrentUser() p: AuthenticatedPrincipal, @Query() q: InventoryListDto) { return this.sims.list(p, q); }
  @Get(':id') @Version('1') @RequirePermissions(permissions.simsRead) get(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string) { return this.sims.get(p, id); }
  @Post() @Version('1') @RequirePermissions(permissions.simsCreate) create(@CurrentUser() p: AuthenticatedPrincipal, @Body() dto: CreateSimDto) { return this.sims.create(p, dto); }
  @Patch(':id') @Version('1') @RequirePermissions(permissions.simsUpdate) update(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateSimDto) { return this.sims.update(p, id, dto); }
  @Patch(':id/status') @Version('1') @RequirePermissions(permissions.simsUpdate) updateStatus(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateStatusDto) { return this.sims.updateStatus(p, id, dto); }
  @Post(':id/recharges') @Version('1') @RequirePermissions(permissions.simsUpdate) recharge(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: SimPackageRechargeDto) { return this.sims.recharge(p, id, dto); }
}
