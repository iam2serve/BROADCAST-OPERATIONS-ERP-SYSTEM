import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AssetTypeDto, OwnershipTransferDto, ReturnOwnershipDto, TelemetryIngestDto } from './dto/inventory-common.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async transferOwnership(
    principal: AuthenticatedPrincipal,
    assetType: AssetTypeDto,
    assetId: string,
    dto: OwnershipTransferDto,
  ) {
    await this.ensureAsset(principal.organizationId, assetType, assetId);
    await this.prisma.assetOwnershipHistory.updateMany({
      where: { organizationId: principal.organizationId, assetType, assetId, returnedAt: null },
      data: { returnedAt: new Date() },
    });
    const history = await this.prisma.assetOwnershipHistory.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        assetType,
        assetId,
        assignedToUserId: dto.assignedToUserId,
        assignedById: principal.userId,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.record({
      userId: principal.userId,
      action: 'inventory.ownership_transferred',
      entityType: assetType,
      entityId: assetId,
      newValues: dto,
    });
    return history;
  }

  async returnOwnership(
    principal: AuthenticatedPrincipal,
    assetType: AssetTypeDto,
    assetId: string,
    dto: ReturnOwnershipDto,
  ) {
    await this.ensureAsset(principal.organizationId, assetType, assetId);
    await this.prisma.assetOwnershipHistory.updateMany({
      where: { organizationId: principal.organizationId, assetType, assetId, returnedAt: null },
      data: { returnedAt: new Date(), ...(dto.notes !== undefined ? { notes: dto.notes } : {}) },
    });
    await this.audit.record({
      userId: principal.userId,
      action: 'inventory.ownership_returned',
      entityType: assetType,
      entityId: assetId,
      newValues: dto,
    });
    return { returned: true };
  }

  async ingestTelemetry(principal: AuthenticatedPrincipal, dto: TelemetryIngestDto) {
    await this.ensureAsset(principal.organizationId, dto.assetType, dto.assetId);
    const metric = await this.prisma.assetTelemetryMetric.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        assetType: dto.assetType,
        assetId: dto.assetId,
        measuredAt: dto.measuredAt ? new Date(dto.measuredAt) : new Date(),
        heartbeatAt: dto.heartbeatAt ? new Date(dto.heartbeatAt) : null,
        signalRssi: dto.signalRssi ?? null,
        signalRsrp: dto.signalRsrp ?? null,
        signalRsrq: dto.signalRsrq ?? null,
        signalSinr: dto.signalSinr ?? null,
        batteryLevel: dto.batteryLevel ?? null,
        uploadSpeedMbps: dto.uploadSpeedMbps ?? null,
        downloadSpeedMbps: dto.downloadSpeedMbps ?? null,
        latencyMs: dto.latencyMs ?? null,
        packetLossPercent: dto.packetLossPercent ?? null,
        bandwidthMbps: dto.bandwidthMbps ?? null,
        source: dto.source ?? null,
      },
    });

    if (dto.assetType === AssetTypeDto.DEVICE) {
      await this.prisma.broadcastDevice.update({
        where: { id: dto.assetId },
        data: {
          lastSeenAt: new Date(),
          ...(dto.heartbeatAt ? { lastOnlineAt: new Date(dto.heartbeatAt) } : {}),
          ...(dto.signalRssi !== undefined ? { signalRssi: dto.signalRssi } : {}),
          ...(dto.signalRsrp !== undefined ? { signalRsrp: dto.signalRsrp } : {}),
          ...(dto.signalRsrq !== undefined ? { signalRsrq: dto.signalRsrq } : {}),
          ...(dto.signalSinr !== undefined ? { signalSinr: dto.signalSinr } : {}),
          ...(dto.batteryLevel !== undefined ? { batteryLevel: dto.batteryLevel } : {}),
        },
      });
    }

    if (dto.assetType === AssetTypeDto.ROUTER) {
      await this.prisma.router.update({
        where: { id: dto.assetId },
        data: {
          lastSeenAt: new Date(),
          ...(dto.heartbeatAt ? { lastOnlineAt: new Date(dto.heartbeatAt) } : {}),
          ...(dto.signalRssi !== undefined ? { signalRssi: dto.signalRssi } : {}),
          ...(dto.signalRsrp !== undefined ? { signalRsrp: dto.signalRsrp } : {}),
          ...(dto.signalRsrq !== undefined ? { signalRsrq: dto.signalRsrq } : {}),
          ...(dto.signalSinr !== undefined ? { signalSinr: dto.signalSinr } : {}),
          ...(dto.uploadSpeedMbps !== undefined ? { uploadSpeedMbps: dto.uploadSpeedMbps } : {}),
          ...(dto.downloadSpeedMbps !== undefined ? { downloadSpeedMbps: dto.downloadSpeedMbps } : {}),
          ...(dto.latencyMs !== undefined ? { latencyMs: dto.latencyMs } : {}),
          ...(dto.packetLossPercent !== undefined ? { packetLossPercent: dto.packetLossPercent } : {}),
        },
      });
    }

    return metric;
  }

  private async ensureAsset(organizationId: string, assetType: AssetTypeDto, assetId: string): Promise<void> {
    const where = { id: assetId, organizationId, deletedAt: null };
    const exists =
      assetType === AssetTypeDto.DEVICE
        ? await this.prisma.broadcastDevice.findFirst({ where, select: { id: true } })
        : assetType === AssetTypeDto.SIM
          ? await this.prisma.simCard.findFirst({ where, select: { id: true } })
          : await this.prisma.router.findFirst({ where, select: { id: true } });

    if (!exists) {
      throw new NotFoundException({ code: 'ASSET_NOT_FOUND', message: 'Inventory asset was not found.' });
    }
  }

  toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
