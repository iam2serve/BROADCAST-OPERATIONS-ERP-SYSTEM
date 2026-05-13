import { Module } from '@nestjs/common';
import { SecurityModule } from '../../common/security/security.module.js';
import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { RoutersController } from './routers.controller.js';
import { RoutersService } from './routers.service.js';

@Module({ imports: [DatabaseModule, AuditModule, SecurityModule], controllers: [RoutersController], providers: [RoutersService] })
export class RoutersModule {}
