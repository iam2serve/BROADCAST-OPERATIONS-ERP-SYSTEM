import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';

import { MetricsModule } from './common/metrics/metrics.module.js';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware.js';
import { CsrfOriginMiddleware } from './common/security/csrf-origin.middleware.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { AnalyticsModule } from './modules/analytics/analytics.module.js';
import { AssignmentsModule } from './modules/assignments/assignments.module.js';
import { AutomationModule } from './modules/automation/automation.module.js';
import { AvailabilityModule } from './modules/availability/availability.module.js';
import { OperatorsModule } from './modules/operators/operators.module.js';
import { DevicesModule } from './modules/devices/devices.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { ExpensesModule } from './modules/expenses/expenses.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { RoutersModule } from './modules/routers/routers.module.js';
import { PayrollModule } from './modules/payroll/payroll.module.js';
import { PlatformModule } from './modules/platform/platform.module.js';
import { ReportsModule } from './modules/reports/reports.module.js';
import { SimsModule } from './modules/sims/sims.module.js';
import { SyncModule } from './modules/sync/sync.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { WorkersModule } from './modules/workers/workers.module.js';
import { SystemModule } from './system/system.module.js';

@Module({
  imports: [
    SystemModule,
    MetricsModule,
    AuthModule,
    UsersModule,
    OperatorsModule,
    EventsModule,
    AvailabilityModule,
    AssignmentsModule,
    FinanceModule,
    ExpensesModule,
    PayrollModule,
    PlatformModule,
    NotificationsModule,
    ReportsModule,
    AutomationModule,
    SyncModule,
    WorkersModule,
    AnalyticsModule,
    DevicesModule,
    SimsModule,
    RoutersModule,
    InventoryModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RequestLoggingMiddleware, CsrfOriginMiddleware).forRoutes('*');
  }
}
