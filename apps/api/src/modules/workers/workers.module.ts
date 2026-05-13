import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { WorkerQueueService } from './worker-queue.service.js';
import { WorkersController } from './workers.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [WorkersController],
  providers: [WorkerQueueService],
  exports: [WorkerQueueService],
})
export class WorkersModule {}
