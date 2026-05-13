import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { WorkersModule } from '../workers/workers.module.js';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, WorkersModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
