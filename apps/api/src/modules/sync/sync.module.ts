import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SyncController } from './sync.controller.js';
import { SyncService } from './sync.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
