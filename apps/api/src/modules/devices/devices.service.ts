import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { EncryptionService } from '../../common/security/encryption.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateDeviceDto, DeviceTelemetryDto, UpdateDeviceDto } from './dto/device.dto.js';

@Injectable()
export class DevicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: InventoryListDto) {
    const where: Prisma.BroadcastDeviceWhereInput = {
      organizationId: principal.organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { serialNumber: { contains: query.search, mode: 'insensitive' } },
              { alias: { contains: query.search, mode: 'insensitive' } },
              { assetTag: { contains: query.search, mode: 'insensitive' } },
              { qrCodeIdentifier: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.broadcastDevice.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { simSlots: true } }),
      this.prisma.broadcastDevice.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(principal: AuthenticatedPrincipal, id: string) {
    const device = await this.prisma.broadcastDevice.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null }, include: { simSlots: { include: { sim: true } } } });
    if (!device) throw new NotFoundException({ code: 'DEVICE_NOT_FOUND', message: 'Device was not found.' });
    return device;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateDeviceDto) {
    await this.ensureUnique(principal.organizationId, dto);
    const device = await this.prisma.broadcastDevice.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        serialNumber: dto.serialNumber,
        alias: dto.alias,
        deviceType: dto.deviceType,
        firmwareVersion: dto.firmwareVersion ?? null,
        assetTag: dto.assetTag ?? null,
        qrCodeIdentifier: dto.qrCodeIdentifier ?? null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
        vendor: dto.vendor ?? null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        maintenanceStatus: dto.maintenanceStatus ?? 'OK',
        supportsCellular: dto.supportsCellular ?? true,
        supportsEthernet: dto.supportsEthernet ?? false,
        supportsWifi: dto.supportsWifi ?? false,
        encryptedCredentials: dto.credentials ? this.encryption.encrypt(dto.credentials) : null,
        credentialKeyVersion: dto.credentials ? 1 : null,
        notes: dto.notes ?? null,
        simSlots: { create: [1, 2, 3, 4].map((slotNumber) => ({ slotNumber })) },
      },
      include: { simSlots: true },
    });
    await this.audit.record({ userId: principal.userId, action: 'inventory.device_created', entityType: 'BroadcastDevice', entityId: device.id, newValues: { serialNumber: dto.serialNumber } });
    return device;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateDeviceDto) {
    await this.get(principal, id);
    const device = await this.prisma.broadcastDevice.update({
      where: { id },
      data: {
        ...(dto.serialNumber ? { serialNumber: dto.serialNumber } : {}),
        ...(dto.alias ? { alias: dto.alias } : {}),
        ...(dto.deviceType ? { deviceType: dto.deviceType } : {}),
        ...(dto.firmwareVersion !== undefined ? { firmwareVersion: dto.firmwareVersion } : {}),
        ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag } : {}),
        ...(dto.qrCodeIdentifier !== undefined ? { qrCodeIdentifier: dto.qrCodeIdentifier } : {}),
        ...(dto.purchaseDate ? { purchaseDate: new Date(dto.purchaseDate) } : {}),
        ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
        ...(dto.warrantyExpiry ? { warrantyExpiry: new Date(dto.warrantyExpiry) } : {}),
        ...(dto.maintenanceStatus ? { maintenanceStatus: dto.maintenanceStatus } : {}),
        ...(dto.credentials ? { encryptedCredentials: this.encryption.encrypt(dto.credentials), credentialKeyVersion: 1 } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: dto.credentials ? 'inventory.device_credentials_updated' : 'inventory.device_updated', entityType: 'BroadcastDevice', entityId: id, newValues: dto });
    return device;
  }

  async updateStatus(principal: AuthenticatedPrincipal, id: string, dto: UpdateStatusDto) {
    await this.get(principal, id);
    const device = await this.prisma.broadcastDevice.update({ where: { id }, data: { status: dto.status, ...(dto.notes !== undefined ? { notes: dto.notes } : {}) } });
    await this.audit.record({ userId: principal.userId, action: 'inventory.device_status_changed', entityType: 'BroadcastDevice', entityId: id, newValues: dto });
    return device;
  }

  async ingestTelemetry(principal: AuthenticatedPrincipal, id: string, dto: DeviceTelemetryDto) {
    await this.get(principal, id);
    return this.prisma.broadcastDevice.update({ where: { id }, data: { ...dto, lastSeenAt: new Date(), lastOnlineAt: new Date() } });
  }

  private async ensureUnique(organizationId: string, dto: CreateDeviceDto) {
    const existing = await this.prisma.broadcastDevice.findFirst({ where: { organizationId, OR: [{ serialNumber: dto.serialNumber }, ...(dto.assetTag ? [{ assetTag: dto.assetTag }] : []), ...(dto.qrCodeIdentifier ? [{ qrCodeIdentifier: dto.qrCodeIdentifier }] : [])] } });
    if (existing) throw new ConflictException({ code: 'DEVICE_ALREADY_EXISTS', message: 'Device serial, asset tag, or QR code already exists.' });
  }
}
