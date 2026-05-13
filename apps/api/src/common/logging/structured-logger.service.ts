import { Injectable, type LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose';

@Injectable()
export class StructuredLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, { trace });
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  private write(level: LogLevel, message: unknown, context?: string, extra?: Record<string, unknown>): void {
    const entry = {
      level,
      time: new Date().toISOString(),
      context,
      message,
      ...extra,
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      process.stderr.write(`${output}\n`);
      return;
    }

    process.stdout.write(`${output}\n`);
  }
}
