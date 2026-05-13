import { Body, Controller, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { CreateRouterDto, UpdateRouterDto } from './dto/router.dto.js';
import { RoutersService } from './routers.service.js';

@Controller('routers')
export class RoutersController {
  constructor(private readonly routers: RoutersService) {}
  @Get() @Version('1') @RequirePermissions(permissions.routersRead) list(@CurrentUser() p: AuthenticatedPrincipal, @Query() q: InventoryListDto) { return this.routers.list(p, q); }
  @Get(':id') @Version('1') @RequirePermissions(permissions.routersRead) get(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string) { return this.routers.get(p, id); }
  @Post() @Version('1') @RequirePermissions(permissions.routersCreate) create(@CurrentUser() p: AuthenticatedPrincipal, @Body() dto: CreateRouterDto) { return this.routers.create(p, dto); }
  @Patch(':id') @Version('1') @RequirePermissions(permissions.routersUpdate) update(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateRouterDto) { return this.routers.update(p, id, dto); }
  @Patch(':id/status') @Version('1') @RequirePermissions(permissions.routersUpdate) updateStatus(@CurrentUser() p: AuthenticatedPrincipal, @Param('id') id: string, @Body() dto: UpdateStatusDto) { return this.routers.updateStatus(p, id, dto); }
}
