import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../database/prisma.service.js';
import { MetricsService } from '../metrics/metrics.service.js';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  constructor(
    private readonly metrics: MetricsService,
    private readonly prisma: PrismaService,
  ) {}

  use(request: Request, response: Response, next: NextFunction): void {
    const startedAt = performance.now();

    response.on('finish', () => {
      const durationMs = Math.round(performance.now() - startedAt);
      const organizationId = request.user?.organizationId;
      const userId = request.user?.userId;

      this.metrics.increment('requests', { method: request.method, status: response.statusCode });
      this.metrics.observe('api.duration', durationMs, { method: request.method, route: request.path });
      if (response.statusCode >= 500) this.metrics.increment('errors', { status: response.statusCode });

      this.logger.log(
        JSON.stringify({
          requestId: request.requestId,
          method: request.method,
          path: request.originalUrl,
          statusCode: response.statusCode,
          durationMs,
          ip: request.ip,
          userAgent: request.headers['user-agent'],
        }),
      );

      if (organizationId) {
        void this.prisma.apiUsageEvent.create({
          data: {
            organizationId,
            userId: userId ?? null,
            route: request.originalUrl,
            method: request.method,
            statusCode: response.statusCode,
            durationMs,
            requestId: request.requestId ?? null,
          },
        }).catch(() => undefined);
      }
    });

    next();
  }
}
