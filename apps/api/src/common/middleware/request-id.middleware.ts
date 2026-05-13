import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

export const requestIdHeader = 'x-request-id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incomingRequestId = request.header(requestIdHeader);
    const requestId = incomingRequestId && incomingRequestId.length > 0 ? incomingRequestId : randomUUID();

    request.requestId = requestId;
    response.setHeader(requestIdHeader, requestId);

    next();
  }
}
