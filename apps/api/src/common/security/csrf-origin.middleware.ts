import { ForbiddenException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { parseCorsOrigins } from '@broadcast/config';

import { AppConfigService } from '../../system/app-config.service.js';

const protectedMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class CsrfOriginMiddleware implements NestMiddleware {
  constructor(private readonly config: AppConfigService) {}

  use(request: Request, _response: Response, next: NextFunction): void {
    if (!protectedMethods.has(request.method)) {
      next();
      return;
    }

    const trusted = parseCorsOrigins(this.config.values.CSRF_TRUSTED_ORIGINS ?? this.config.values.CORS_ORIGINS);
    const origin = request.header('origin');
    if (origin && trusted.includes(origin)) {
      next();
      return;
    }

    if (!origin && this.config.values.APP_ENV !== 'production') {
      next();
      return;
    }

    throw new ForbiddenException({ code: 'CSRF_ORIGIN_REJECTED', message: 'Request origin is not trusted.' });
  }
}
