import { Module } from '@nestjs/common';

import { AppConfigService } from './app-config.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  controllers: [HealthController],
  providers: [AppConfigService, HealthService],
  exports: [AppConfigService],
})
export class SystemModule {}
