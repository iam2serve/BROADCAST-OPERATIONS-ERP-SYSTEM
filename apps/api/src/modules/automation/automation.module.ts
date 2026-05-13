import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { WorkersModule } from '../workers/workers.module.js';
import { AutomationController } from './automation.controller.js';
import { AutomationService } from './automation.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, WorkersModule],
  controllers: [AutomationController],
  providers: [AutomationService],
})
export class AutomationModule {}
