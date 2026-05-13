import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { CreateOperatorDto } from './dto/create-operator.dto.js';
import { ListOperatorsDto } from './dto/list-operators.dto.js';
import { UpdateOperatorDto } from './dto/update-operator.dto.js';

@Injectable()
export class OperatorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListOperatorsDto) {
    const where: Prisma.OperatorProfileWhereInput = {
      organizationId: principal.organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.role ? { role: { contains: query.role, mode: 'insensitive' } } : {}),
      ...(query.search
        ? {
            OR: [
              { role: { contains: query.search, mode: 'insensitive' } },
              { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { user: { email: { contains: query.search, mode: 'insensitive' } } },
              { user: { phone: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.operatorProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: this.operatorSelect(),
      }),
      this.prisma.operatorProfile.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        pageCount: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getById(principal: AuthenticatedPrincipal, id: string) {
    const operator = await this.prisma.operatorProfile.findFirst({
      where: { id, organizationId: principal.organizationId, deletedAt: null },
      select: this.operatorSelect(),
    });

    if (!operator) {
      throw new NotFoundException({ code: 'OPERATOR_NOT_FOUND', message: 'Operator was not found.' });
    }

    return operator;
  }

  async create(principal: AuthenticatedPrincipal, dto: CreateOperatorDto, context: RequestContext) {
    const user = await this.prisma.user.findFirst({
      where: { id: dto.userId, organizationId: principal.organizationId, deletedAt: null },
      include: { operatorProfile: true },
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
    }

    if (user.operatorProfile) {
      throw new ConflictException({ code: 'OPERATOR_ALREADY_EXISTS', message: 'User already has an operator profile.' });
    }

    const operator = await this.prisma.operatorProfile.create({
      data: {
        organizationId: principal.organizationId,
        branchId: user.branchId,
        userId: user.id,
        role: dto.role,
        salaryType: dto.salaryType,
        ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.dailyRate !== undefined ? { dailyRate: dto.dailyRate } : {}),
        ...(dto.eventRate !== undefined ? { eventRate: dto.eventRate } : {}),
        ...(dto.emergencyContactName !== undefined ? { emergencyContactName: dto.emergencyContactName } : {}),
        ...(dto.emergencyContactPhone !== undefined ? { emergencyContactPhone: dto.emergencyContactPhone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: this.operatorSelect(),
    });

    await this.audit.record({
      userId: principal.userId,
      action: 'operators.created',
      entityType: 'OperatorProfile',
      entityId: operator.id,
      newValues: dto,
      context,
    });

    return operator;
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateOperatorDto, context: RequestContext) {
    await this.getById(principal, id);
    const operator = await this.prisma.operatorProfile.update({
      where: { id },
      data: {
        ...(dto.nationalId !== undefined ? { nationalId: dto.nationalId } : {}),
        ...(dto.address !== undefined ? { address: dto.address } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.salaryType ? { salaryType: dto.salaryType } : {}),
        ...(dto.dailyRate !== undefined ? { dailyRate: dto.dailyRate } : {}),
        ...(dto.eventRate !== undefined ? { eventRate: dto.eventRate } : {}),
        ...(dto.emergencyContactName !== undefined ? { emergencyContactName: dto.emergencyContactName } : {}),
        ...(dto.emergencyContactPhone !== undefined ? { emergencyContactPhone: dto.emergencyContactPhone } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
      select: this.operatorSelect(),
    });

    await this.audit.record({
      userId: principal.userId,
      action: 'operators.updated',
      entityType: 'OperatorProfile',
      entityId: id,
      newValues: dto,
      context,
    });

    return operator;
  }

  async availability(principal: AuthenticatedPrincipal, id: string) {
    const operator = await this.getById(principal, id);

    return {
      operatorId: operator.id,
      status: operator.status,
      availability: operator.status === 'ACTIVE' ? 'AVAILABLE_FOR_ASSIGNMENT_CHECK' : 'UNAVAILABLE',
      assignmentOwnership: {
        userId: operator.user.id,
        operatorProfileId: operator.id,
      },
    };
  }

  private operatorSelect() {
    return {
      id: true,
      organizationId: true,
      branchId: true,
      role: true,
      salaryType: true,
      dailyRate: true,
      eventRate: true,
      status: true,
      nationalId: true,
      address: true,
      emergencyContactName: true,
      emergencyContactPhone: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          status: true,
        },
      },
    } satisfies Prisma.OperatorProfileSelect;
  }
}
