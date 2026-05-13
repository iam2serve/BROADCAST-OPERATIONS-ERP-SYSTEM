import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { EventTimelineService } from './event-timeline.service.js';
import { EventsController } from './events.controller.js';
import { EventsService } from './events.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [EventsController],
  providers: [EventsService, EventTimelineService],
  exports: [EventsService, EventTimelineService],
})
export class EventsModule {}
