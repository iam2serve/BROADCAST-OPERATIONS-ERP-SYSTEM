import { Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';
import type { Prisma } from '@broadcast/database';

import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class WorkerQueueService {
  constructor(private readonly prisma: PrismaService) {}

  enqueue(principal: Pick<AuthenticatedPrincipal, 'organizationId'> | null, type: string, queue: string, payload: unknown, runAt = new Date()) {
    return this.prisma.workerJob.create({
      data: {
        organizationId: principal?.organizationId ?? null,
        type,
        queue,
        payload: this.toJson(payload),
        runAt,
      },
    });
  }

  async claimDue(queue: string, workerId: string, take = 10) {
    const jobs = await this.prisma.workerJob.findMany({
      where: { queue, status: 'QUEUED', runAt: { lte: new Date() } },
      orderBy: { runAt: 'asc' },
      take,
    });
    await Promise.all(jobs.map((job) => this.prisma.workerJob.update({ where: { id: job.id }, data: { status: 'PROCESSING', lockedAt: new Date(), lockedBy: workerId, attempts: { increment: 1 } } })));
    return jobs;
  }

  complete(jobId: string) {
    return this.prisma.workerJob.update({ where: { id: jobId }, data: { status: 'COMPLETED' } });
  }

  fail(jobId: string, errorMessage: string) {
    return this.prisma.workerJob.update({ where: { id: jobId }, data: { status: 'FAILED', errorMessage } });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
