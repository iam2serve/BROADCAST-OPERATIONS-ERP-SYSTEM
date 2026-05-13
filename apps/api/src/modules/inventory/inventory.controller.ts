import { Body, Controller, Param, Patch, Post, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { AssetTypeDto, OwnershipTransferDto, ReturnOwnershipDto, TelemetryIngestDto } from './dto/inventory-common.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post('telemetry')
  @Version('1')
  @RequirePermissions(permissions.inventoryTelemetryIngest)
  ingestTelemetry(@CurrentUser() principal: AuthenticatedPrincipal, @Body() dto: TelemetryIngestDto) {
    return this.inventory.ingestTelemetry(principal, dto);
  }

  @Post(':assetType/:assetId/ownership')
  @Version('1')
  @RequirePermissions(permissions.operatorsAssign)
  transferOwnership(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('assetType') assetType: AssetTypeDto,
    @Param('assetId') assetId: string,
    @Body() dto: OwnershipTransferDto,
  ) {
    return this.inventory.transferOwnership(principal, assetType, assetId, dto);
  }

  @Patch(':assetType/:assetId/ownership/return')
  @Version('1')
  @RequirePermissions(permissions.operatorsAssign)
  returnOwnership(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('assetType') assetType: AssetTypeDto,
    @Param('assetId') assetId: string,
    @Body() dto: ReturnOwnershipDto,
  ) {
    return this.inventory.returnOwnership(principal, assetType, assetId, dto);
  }
}
