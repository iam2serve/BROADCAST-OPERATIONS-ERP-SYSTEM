import { Module } from '@nestjs/common';

import { MetricsModule } from '../common/metrics/metrics.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AppConfigService } from './app-config.service.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [DatabaseModule, MetricsModule],
  controllers: [HealthController],
  providers: [AppConfigService, HealthService],
  exports: [AppConfigService],
})
export class SystemModule {}
