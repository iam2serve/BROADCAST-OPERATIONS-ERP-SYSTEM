import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { EncryptionService } from '../../common/security/encryption.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { InventoryListDto, UpdateStatusDto } from '../inventory/dto/inventory-common.dto.js';
import { CreateSimDto, SimPackageRechargeDto, UpdateSimDto } from './dto/sim.dto.js';

@Injectable()
export class SimsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: InventoryListDto) {
    const where: Prisma.SimCardWhereInput = {
      organizationId: principal.organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search ? { OR: [{ phoneNumber: { contains: query.search, mode: 'insensitive' } }, { iccid: { contains: query.search, mode: 'insensitive' } }, { assetTag: { contains: query.search, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.simCard.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.simCard.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async get(principal: AuthenticatedPrincipal, id: string) {
    const sim = await this.prisma.simCard.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null }, include: { packageHistory: { orderBy: { createdAt: 'desc' } }, usageMetrics: { orderBy: { measuredAt: 'desc' }, take: 10 } } });
    if (!sim) throw new NotFoundException({ code: 'SIM_NOT_FOUND', message: 'SIM card was not found.' });
    return sim;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateSimDto) {
    await this.ensureUnique(principal.organizationId, dto);
    const sim = await this.prisma.simCard.create({
      data: {
        organizationId: principal.organizationId,
        branchId: principal.branchId ?? null,
        phoneNumber: dto.phoneNumber,
        iccid: dto.iccid,
        imsi: dto.imsi ?? null,
        carrier: dto.carrier,
        packageType: dto.packageType ?? null,
        packageRenewalDate: dto.packageRenewalDate ? new Date(dto.packageRenewalDate) : null,
        mainControllingNumber: dto.mainControllingNumber ?? null,
        apn: dto.apn ?? null,
        assetTag: dto.assetTag ?? null,
        qrCodeIdentifier: dto.qrCodeIdentifier ?? null,
        encryptedCredentials: dto.credentials ? this.encryption.encrypt(dto.credentials) : null,
        credentialKeyVersion: dto.credentials ? 1 : null,
        notes: dto.notes ?? null,
      },
    });
    await this.audit.record({ userId: principal.userId, action: 'inventory.sim_created', entityType: 'SimCard', entityId: sim.id, newValues: { phoneNumber: dto.phoneNumber, carrier: dto.carrier } });
    return sim;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateSimDto) {
    await this.get(principal, id);
    const sim = await this.prisma.simCard.update({
      where: { id },
      data: {
        ...(dto.phoneNumber ? { phoneNumber: dto.phoneNumber } : {}),
        ...(dto.iccid ? { iccid: dto.iccid } : {}),
        ...(dto.imsi !== undefined ? { imsi: dto.imsi } : {}),
        ...(dto.carrier ? { carrier: dto.carrier } : {}),
        ...(dto.packageType !== undefined ? { packageType: dto.packageType } : {}),
        ...(dto.packageRenewalDate ? { packageRenewalDate: new Date(dto.packageRenewalDate) } : {}),
        ...(dto.mainControllingNumber !== undefined ? { mainControllingNumber: dto.mainControllingNumber } : {}),
        ...(dto.apn !== undefined ? { apn: dto.apn } : {}),
        ...(dto.assetTag !== undefined ? { assetTag: dto.assetTag } : {}),
        ...(dto.qrCodeIdentifier !== undefined ? { qrCodeIdentifier: dto.qrCodeIdentifier } : {}),
        ...(dto.credentials ? { encryptedCredentials: this.encryption.encrypt(dto.credentials), credentialKeyVersion: 1 } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
    await this.audit.record({ userId: principal.userId, action: dto.credentials ? 'inventory.sim_credentials_updated' : 'inventory.sim_updated', entityType: 'SimCard', entityId: id, newValues: dto });
    return sim;
  }

  async updateStatus(principal: AuthenticatedPrincipal, id: string, dto: UpdateStatusDto) {
    await this.get(principal, id);
    const sim = await this.prisma.simCard.update({ where: { id }, data: { status: dto.status, ...(dto.notes !== undefined ? { notes: dto.notes } : {}) } });
    await this.audit.record({ userId: principal.userId, action: 'inventory.sim_status_changed', entityType: 'SimCard', entityId: id, newValues: dto });
    return sim;
  }

  async recharge(principal: AuthenticatedPrincipal, id: string, dto: SimPackageRechargeDto) {
    await this.get(principal, id);
    const history = await this.prisma.simPackageHistory.create({
      data: { simId: id, rechargeDate: new Date(dto.rechargeDate), packageType: dto.packageType, amount: dto.amount, expiryDate: new Date(dto.expiryDate), notes: dto.notes ?? null, recordedById: principal.userId },
    });
    await this.prisma.simCard.update({ where: { id }, data: { packageType: dto.packageType, packageRenewalDate: new Date(dto.expiryDate) } });
    await this.audit.record({ userId: principal.userId, action: 'inventory.sim_package_updated', entityType: 'SimCard', entityId: id, newValues: dto });
    return history;
  }

  private async ensureUnique(organizationId: string, dto: CreateSimDto) {
    const existing = await this.prisma.simCard.findFirst({ where: { organizationId, OR: [{ phoneNumber: dto.phoneNumber }, { iccid: dto.iccid }, ...(dto.imsi ? [{ imsi: dto.imsi }] : []), ...(dto.assetTag ? [{ assetTag: dto.assetTag }] : [])] } });
    if (existing) throw new ConflictException({ code: 'SIM_ALREADY_EXISTS', message: 'SIM phone, ICCID, IMSI, or asset tag already exists.' });
  }
}
