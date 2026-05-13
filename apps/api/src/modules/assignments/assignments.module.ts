import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { EventsModule } from '../events/events.module.js';
import { AssignmentsController, EventAssignmentsController } from './assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, EventsModule, AvailabilityModule],
  controllers: [EventAssignmentsController, AssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
