import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { OperatorsController } from './operators.controller.js';
import { OperatorsService } from './operators.service.js';

@Module({
  imports: [DatabaseModule, AuditModule],
  controllers: [OperatorsController],
  providers: [OperatorsService],
})
export class OperatorsModule {}
