import { Module } from '@nestjs/common';
import { SecurityModule } from '../../common/security/security.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { SimsController } from './sims.controller.js';
import { SimsService } from './sims.service.js';

@Module({ imports: [DatabaseModule, AuditModule, SecurityModule], controllers: [SimsController], providers: [SimsService] })
export class SimsModule {}
