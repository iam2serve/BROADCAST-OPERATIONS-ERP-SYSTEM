import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { EncryptionService } from '../../common/security/encryption.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { CreateRouterDto, UpdateRouterDto } from './dto/router.dto.js';

@Injectable()
export class RoutersService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService, private readonly encryption: EncryptionService) {}

  async list(principal: AuthenticatedPrincipal, query: InventoryListDto) {
    const where: Prisma.RouterWhereInput = { organizationId: principal.organizationId, deletedAt: null, ...(query.status ? { status: query.status } : {}), ...(query.search ? { OR: [{ imei: { contains: query.search, mode: 'insensitive' } }, { brand: { contains: query.search, mode: 'insensitive' } }, { model: { contains: query.search, mode: 'insensitive' } }, { assetTag: { contains: query.search, mode: 'insensitive' } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.router.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { currentSim: true } }),
      this.prisma.router.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(principal: AuthenticatedPrincipal, id: string) {
    const router = await this.prisma.router.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null }, include: { currentSim: true } });
    if (!router) throw new NotFoundException({ code: 'ROUTER_NOT_FOUND', message: 'Router was not found.' });
    return router;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateRouterDto) {
    await this.ensureUnique(principal.organizationId, dto);
    const router = await this.prisma.router.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        imei: dto.imei,
        brand: dto.brand,
        model: dto.model,
        lanIp: dto.lanIp ?? null,
        wifiSsid: dto.wifiSsid ?? null,
        wifiPasswordEncrypted: dto.wifiPassword ? this.encryption.encrypt(dto.wifiPassword) : null,
        wifiPasswordKeyVersion: dto.wifiPassword ? 1 : null,
        assetTag: dto.assetTag ?? null,
        qrCodeIdentifier: dto.qrCodeIdentifier ?? null,
        vendor: dto.vendor ?? null,
        warrantyExpiry: dto.warrantyExpiry ? new Date(dto.warrantyExpiry) : null,
        maintenanceStatus: dto.maintenanceStatus ?? 'OK',
        currentSimId: dto.currentSimId ?? null,
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'inventory.router_created', entityType: 'Router', entityId: router.id, newValues: { imei: dto.imei } });
    return router;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateRouterDto) {
    await this.get(principal, id);
    const router = await this.prisma.router.update({
      where: { id },
      data: {
        ...(dto.imei ? { imei: dto.imei } : {}),
        ...(dto.brand ? { brand: dto.brand } : {}),
        ...(dto.model ? { model: dto.model } : {}),
        ...(dto.lanIp !== undefined ? { lanIp: dto.lanIp } : {}),
        ...(dto.wifiSsid !== undefined ? { wifiSsid: dto.wifiSsid } : {}),
        ...(dto.wifiPassword ? { wifiPasswordEncrypted: this.encryption.encrypt(dto.wifiPassword), wifiPasswordKeyVersion: 1 } : {}),
        ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag } : {}),
        ...(dto.qrCodeIdentifier !== undefined ? { qrCodeIdentifier: dto.qrCodeIdentifier } : {}),
        ...(dto.vendor !== undefined ? { vendor: dto.vendor } : {}),
        ...(dto.warrantyExpiry ? { warrantyExpiry: new Date(dto.warrantyExpiry) } : {}),
        ...(dto.maintenanceStatus ? { maintenanceStatus: dto.maintenanceStatus } : {}),
        ...(dto.currentSimId !== undefined ? { currentSimId: dto.currentSimId } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: dto.wifiPassword ? 'inventory.router_credentials_updated' : 'inventory.router_updated', entityType: 'Router', entityId: id, newValues: { ...dto, wifiPassword: dto.wifiPassword ? '[REDACTED]' : undefined } });
    return router;
  }

  async updateStatus(principal: AuthenticatedPrincipal, id: string, dto: UpdateStatusDto) {
    await this.get(principal, id);
    const router = await this.prisma.router.update({ where: { id }, data: { status: dto.status } });
    await this.audit.record({ userId: principal.userId, action: 'inventory.router_status_changed', entityType: 'Router', entityId: id, newValues: dto });
    return router;
  }

  private async ensureUnique(organizationId: string, dto: CreateRouterDto) {
    const existing = await this.prisma.router.findFirst({ where: { organizationId, OR: [{ imei: dto.imei }, ...(dto.assetTag ? [{ assetTag: dto.assetTag }] : []), ...(dto.qrCodeIdentifier ? [{ qrCodeIdentifier: dto.qrCodeIdentifier }] : [])] } });
    if (existing) throw new ConflictException({ code: 'ROUTER_ALREADY_EXISTS', message: 'Router IMEI, asset tag, or QR code already exists.' });
  }
}
