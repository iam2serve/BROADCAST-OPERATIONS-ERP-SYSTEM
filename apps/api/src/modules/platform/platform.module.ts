import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { PlatformController } from './platform.controller.js';
import { QuotasService } from './quotas.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PlatformController],
  providers: [QuotasService],
})
export class PlatformModule {}
