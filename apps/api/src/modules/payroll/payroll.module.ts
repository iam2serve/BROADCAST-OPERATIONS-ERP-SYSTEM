import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { FinanceModule } from '../finance/finance.module.js';
import { PayrollController } from './payroll.controller.js';
import { PayrollService } from './payroll.service.js';

@Module({
  imports: [DatabaseModule, AuditModule, FinanceModule],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
