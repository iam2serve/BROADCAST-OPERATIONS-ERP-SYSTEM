import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { EventsModule } from '../events/events.module.js';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';

@Module({
  imports: [DatabaseModule, EventsModule],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
