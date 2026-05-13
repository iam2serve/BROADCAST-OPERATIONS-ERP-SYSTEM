import { Controller, Param, Post, Query, Version } from '@nestjs/common';

import { permissions } from '@broadcast/auth';

import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { WorkerQueueService } from './worker-queue.service.js';

@Controller('workers')
export class WorkersController {
  constructor(private readonly queue: WorkerQueueService) {}

  @Post(':queue/claim')
  @Version('1')
  @RequirePermissions(permissions.automationManage)
  claim(@Param('queue') queue: string, @Query('workerId') workerId = 'api-worker') {
    return this.queue.claimDue(queue, workerId);
  }
}
