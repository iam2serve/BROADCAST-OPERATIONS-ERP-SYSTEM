import { Module } from '@nestjs/common';

import { SecurityModule } from '../../common/security/security.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { DevicesController } from './devices.controller.js';
import { DevicesService } from './devices.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, SecurityModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}
