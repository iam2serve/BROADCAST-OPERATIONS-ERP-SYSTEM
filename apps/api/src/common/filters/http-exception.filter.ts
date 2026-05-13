import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ErrorBody = {
  code?: string;
  message?: string | string[];
  details?: unknown;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.normalizeException(exception);
    const message = Array.isArray(body.message) ? body.message.join(', ') : body.message;

    const category = status >= 500 ? 'server_error' : status >= 400 ? 'client_error' : 'unknown';
    const privateError = exception instanceof Error ? exception.stack : exception;
    this.logger[status >= 500 ? 'error' : 'warn'](
      JSON.stringify({ requestId: request.requestId, method: request.method, path: request.url, status, category, error: privateError }),
    );

    response.status(status).json({
      success: false,
      error: {
        code: body.code ?? this.defaultCode(status),
        message: message ?? 'Unexpected error',
        details: status >= 500 ? undefined : body.details,
      },
      meta: {
        requestId: request.requestId ?? 'unknown',
      },
    });
  }

  private normalizeException(exception: unknown): ErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected server error occurred.',
      };
    }

    const response = exception.getResponse();

    if (typeof response === 'string') {
      return {
        message: response,
      };
    }

    if (typeof response === 'object' && response !== null) {
      return response;
    }

    return {
      message: exception.message,
    };
  }

  private defaultCode(status: number): string {
    return HttpStatus[status] ?? 'HTTP_ERROR';
  }
}
