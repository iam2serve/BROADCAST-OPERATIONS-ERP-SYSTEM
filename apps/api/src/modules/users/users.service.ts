import { randomBytes } from 'node:crypto';

import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { PasswordService } from '../auth/services/password.service.js';
import type { RequestContext } from '../../common/context/request-context.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { ListUsersDto } from './dto/list-users.dto.js';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';
import { UpdateUserStatus, UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly passwords: PasswordService,
  ) {}

  async findActiveByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        operatorProfile: true,
      },
    });
  }

  async findAuthProfileById(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        organizationId: true,
        branchId: true,
        status: true,
        role: {
          select: {
            id: true,
            name: true,
            permissions: {
              select: {
                permission: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
        operatorProfile: {
          select: {
            id: true,
            status: true,
          },
        },
        preferences: true,
      },
    });
  }

  async list(principal: AuthenticatedPrincipal, query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      organizationId: principal.organizationId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.roleId ? { roleId: query.roleId } : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: this.userSelect(),
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId: principal.organizationId, deletedAt: null },
      select: this.userSelect(),
    });

    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
    }

    return user;
  }

  async invite(principal: AuthenticatedPrincipal, dto: InviteUserDto, context: RequestContext) {
    const email = dto.email.toLowerCase();
    const existingUser = await this.prisma.user.findFirst({
      where: { organizationId: principal.organizationId, email, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictException({ code: 'USER_ALREADY_EXISTS', message: 'A user with this email already exists.' });
    }

    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, organizationId: principal.organizationId, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException({ code: 'ROLE_NOT_FOUND', message: 'Role was not found.' });
    }

    const token = randomBytes(32).toString('base64url');
    const invitation = await this.prisma.userInvitation.create({
      data: {
        organizationId: principal.organizationId,
        branchId: dto.branchId ?? null,
        email,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        roleId: dto.roleId,
        tokenHash: await this.passwords.hash(token),
        expiresAt: new Date(Date.now() + 7 * 86_400_000),
        invitedById: principal.userId,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        expiresAt: true,
      },
    });

    await this.audit.record({
      userId: principal.userId,
      action: 'users.invitation_created',
      entityType: 'UserInvitation',
      entityId: invitation.id,
      newValues: { email, roleId: dto.roleId },
      context,
    });

    return { invitation, inviteToken: token };
  }

  async acceptInvite(dto: AcceptInviteDto, context: RequestContext) {
    const invitations = await this.prisma.userInvitation.findMany({
      where: {
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { role: true },
    });
    const invitation = await this.findInvitationByToken(invitations, dto.token);

    if (!invitation) {
      throw new UnauthorizedException({ code: 'INVALID_INVITATION', message: 'Invitation is invalid or expired.' });
    }

    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          organizationId: invitation.organizationId,
          branchId: invitation.branchId,
          email: invitation.email,
          fullName: invitation.fullName,
          phone: invitation.phone,
          roleId: invitation.roleId,
          passwordHash,
          status: 'ACTIVE',
          preferences: { create: {} },
        },
        select: this.userSelect(),
      });

      await tx.userInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
          acceptedById: created.id,
        },
      });

      return created;
    });

    await this.audit.record({
      userId: user.id,
      action: 'users.invitation_accepted',
      entityType: 'UserInvitation',
      entityId: invitation.id,
      context,
    });

    return { user };
  }

  async update(principal: AuthenticatedPrincipal, id: string, dto: UpdateUserDto, context: RequestContext) {
    await this.ensureUserInOrganization(principal, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.fullName ? { fullName: dto.fullName } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
        ...(dto.roleId ? { roleId: dto.roleId } : {}),
        ...(dto.branchId !== undefined ? { branchId: dto.branchId } : {}),
      },
      select: this.userSelect(),
    });

    await this.audit.record({
      userId: principal.userId,
      action: 'users.updated',
      entityType: 'User',
      entityId: id,
      newValues: dto,
      context,
    });

    return updated;
  }

  async updateStatus(principal: AuthenticatedPrincipal, id: string, dto: UpdateUserStatusDto, context: RequestContext) {
    if (principal.userId === id && dto.status !== UpdateUserStatus.ACTIVE) {
      throw new ForbiddenException({ code: 'SELF_STATUS_CHANGE_DENIED', message: 'You cannot disable your own account.' });
    }

    await this.ensureUserInOrganization(principal, id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      select: this.userSelect(),
    });

    if (dto.status === UpdateUserStatus.SUSPENDED || dto.status === UpdateUserStatus.INACTIVE) {
      await this.prisma.session.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await this.audit.record({
      userId: principal.userId,
      action: 'users.status_changed',
      entityType: 'User',
      entityId: id,
      newValues: { status: dto.status },
      context,
    });

    return updated;
  }

  async updatePreferences(principal: AuthenticatedPrincipal, id: string, dto: UpdatePreferencesDto) {
    if (principal.userId !== id && !principal.permissions.includes(permissions.usersUpdate)) {
      throw new ForbiddenException({ code: 'PREFERENCES_FORBIDDEN', message: 'You cannot update these preferences.' });
    }

    await this.ensureUserInOrganization(principal, id);

    return this.prisma.userPreferences.upsert({
      where: { userId: id },
      create: {
        userId: id,
        language: dto.language ?? 'EN',
        theme: dto.theme ?? 'SYSTEM',
        timezone: dto.timezone ?? 'Africa/Cairo',
        ...(dto.dashboardPreferences !== undefined
          ? { dashboardPreferences: this.toJsonValue(dto.dashboardPreferences) }
          : {}),
      },
      update: {
        ...(dto.language ? { language: dto.language } : {}),
        ...(dto.theme ? { theme: dto.theme } : {}),
        ...(dto.timezone ? { timezone: dto.timezone } : {}),
        ...(dto.dashboardPreferences !== undefined
          ? { dashboardPreferences: this.toJsonValue(dto.dashboardPreferences) }
          : {}),
      },
    });
  }

  private async ensureUserInOrganization(principal: AuthenticatedPrincipal, id: string): Promise<void> {
    const exists = await this.prisma.user.findFirst({
      where: { id, organizationId: principal.organizationId, deletedAt: null },
      select: { id: true },
    });

    if (!exists) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User was not found.' });
    }
  }

  private async findInvitationByToken<T extends { tokenHash: string }>(invitations: T[], token: string): Promise<T | null> {
    for (const invitation of invitations) {
      if (await this.passwords.verify(invitation.tokenHash, token)) {
        return invitation;
      }
    }

    return null;
  }

  private userSelect() {
    return {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      organizationId: true,
      branchId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      role: { select: { id: true, name: true } },
      operatorProfile: { select: { id: true, status: true, role: true } },
      preferences: true,
    } satisfies Prisma.UserSelect;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
