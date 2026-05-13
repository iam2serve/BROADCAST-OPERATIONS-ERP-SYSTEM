import { Injectable } from '@nestjs/common';

import { MetricsService } from '../common/metrics/metrics.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { AppConfigService } from './app-config.service.js';

type Check = { status: 'ok' | 'degraded' | 'down'; latencyMs?: number; detail?: string };

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
    private readonly config: AppConfigService,
  ) {}

  liveness() {
    return { status: 'ok', service: 'broadcast-operations-api', time: new Date().toISOString() };
  }

  async readiness() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkHttpLikeDependency('redis', this.config.values.REDIS_URL),
      storage: await this.checkStorage(),
      queue: await this.checkQueue(),
      workers: await this.checkWorkers(),
      sync: await this.checkSync(),
    };
    const status = Object.values(checks).every((check) => check.status === 'ok') ? 'ok' : 'degraded';
    return { status, checks };
  }

  metrics() {
    return this.metricsService.snapshot();
  }

  private async checkDatabase(): Promise<Check> {
    const startedAt = performance.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', latencyMs: Math.round(performance.now() - startedAt) };
    } catch (error) {
      return { status: 'down', detail: error instanceof Error ? error.message : 'database unavailable' };
    }
  }

  private async checkQueue(): Promise<Check> {
    const queued = await this.prisma.workerJob.count({ where: { status: 'QUEUED' } });
    const failed = await this.prisma.workerJob.count({ where: { status: 'FAILED' } });
    return { status: failed > 100 ? 'degraded' : 'ok', detail: `queued=${queued};failed=${failed}` };
  }

  private async checkWorkers(): Promise<Check> {
    const staleProcessing = await this.prisma.workerJob.count({
      where: { status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    });
    return { status: staleProcessing > 0 ? 'degraded' : 'ok', detail: `staleProcessing=${staleProcessing}` };
  }

  private async checkSync(): Promise<Check> {
    const openConflicts = await this.prisma.syncConflict.count({ where: { status: 'OPEN' } });
    return { status: openConflicts > 500 ? 'degraded' : 'ok', detail: `openConflicts=${openConflicts}` };
  }

  private async checkStorage(): Promise<Check> {
    try {
      const response = await fetch(this.config.values.S3_ENDPOINT, { method: 'HEAD' });
      return { status: response.status < 500 ? 'ok' : 'degraded', detail: `status=${response.status}` };
    } catch (error) {
      return { status: 'degraded', detail: error instanceof Error ? error.message : 'storage unavailable' };
    }
  }

  private async checkHttpLikeDependency(_name: string, url: string): Promise<Check> {
    if (!url.startsWith('http')) return { status: 'ok', detail: 'tcp health delegated to container healthcheck' };
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return { status: response.status < 500 ? 'ok' : 'degraded', detail: `status=${response.status}` };
    } catch {
      return { status: 'degraded', detail: 'unreachable' };
    }
  }
}
