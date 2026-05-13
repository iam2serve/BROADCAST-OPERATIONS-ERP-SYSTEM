import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { parseCorsOrigins } from '@broadcast/config';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor.js';
import { StructuredLogger } from './common/logging/structured-logger.service.js';
import { AppConfigService } from './system/app-config.service.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: new StructuredLogger(),
  });
  const config = app.get(AppConfigService);

  if (config.values.TRUST_PROXY) {
    const expressApp = app.getHttpAdapter().getInstance() as { set: (key: string, value: unknown) => void };
    expressApp.set('trust proxy', 1);
  }

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: config.values.APP_ENV === 'production' ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  }));
  app.use(cookieParser());
  app.enableCors({
    origin: parseCorsOrigins(config.values.CORS_ORIGINS),
    credentials: true,
  });
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ApiResponseInterceptor());

  await app.listen(config.port);
}

void bootstrap();
