import { Injectable, NotFoundException } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';

import type { RequestContext } from '../../common/context/request-context.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { WorkerQueueService } from '../workers/worker-queue.service.js';
import { BulkMarkReadDto, DispatchNotificationDto, ListNotificationsDto } from './dto/notification.dto.js';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly queue: WorkerQueueService,
  ) {}

  async list(principal: AuthenticatedPrincipal, query: ListNotificationsDto) {
    const where = { userId: principal.userId, ...(query.unread === 'true' ? { isRead: false } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.notification.count({ where }),
    ]);
    return { items, pagination: { page: query.page, pageSize: query.pageSize, total, pageCount: Math.ceil(total / query.pageSize) } };
  }

  async dispatch(principal: AuthenticatedPrincipal, dto: DispatchNotificationDto, context: RequestContext) {
    const notifications = await this.prisma.notification.createManyAndReturn({
      data: dto.userIds.map((userId) => ({
        userId,
        title: dto.title,
        body: dto.body,
        type: dto.type,
        channel: dto.channel ?? 'IN_APP',
        deliveryStatus: dto.channel && String(dto.channel) !== 'IN_APP' ? 'PENDING' : 'DELIVERED',
        deliveredAt: !dto.channel || String(dto.channel) === 'IN_APP' ? new Date() : null,
      })),
    });
    await Promise.all(notifications.map((notification) => this.queue.enqueue(principal, 'notification.delivery', 'notifications', { notificationId: notification.id })));
    await this.audit.record({ userId: principal.userId, action: 'notifications.dispatched', entityType: 'Notification', newValues: { count: notifications.length, type: dto.type }, context });
    return { items: notifications };
  }

  async markRead(principal: AuthenticatedPrincipal, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId: principal.userId } });
    if (!notification) throw new NotFoundException({ code: 'NOTIFICATION_NOT_FOUND', message: 'Notification was not found.' });
    return this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  bulkMarkRead(principal: AuthenticatedPrincipal, dto: BulkMarkReadDto) {
    return this.prisma.notification.updateMany({ where: { userId: principal.userId, id: { in: dto.notificationIds } }, data: { isRead: true, readAt: new Date() } });
  }
}
