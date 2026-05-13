CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'PUSH', 'SMS', 'WHATSAPP');
CREATE TYPE "WorkerJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "AutomationRuleStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');
CREATE TYPE "AutomationTriggerType" AS ENUM ('SIM_PACKAGE_EXPIRY', 'EVENT_STARTING_SOON', 'DEVICE_OFFLINE', 'EXPENSE_PENDING_TOO_LONG', 'ASSIGNMENT_CONFLICT', 'OVERDUE_REIMBURSEMENT', 'SCHEDULED');
CREATE TYPE "ReportType" AS ENUM ('EVENT_PROFITABILITY', 'OPERATOR_PAYOUTS', 'SIM_UTILIZATION', 'DEVICE_UTILIZATION', 'ASSIGNMENT_HISTORY', 'EXPENSE_BREAKDOWN', 'PAYROLL_SUMMARY');
CREATE TYPE "ReportExportFormat" AS ENUM ('JSON', 'CSV', 'PDF');
CREATE TYPE "ReportRunStatus" AS ENUM ('QUEUED', 'COMPLETED', 'FAILED');
CREATE TYPE "SyncConflictStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISCARDED');
CREATE TYPE "SyncConflictResolution" AS ENUM ('SERVER_WINS', 'CLIENT_RETRY', 'MANUAL_REVIEW', 'MERGE_SAFE_FIELDS');

ALTER TABLE "Notification"
ADD COLUMN "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
ADD COLUMN "templateKey" TEXT,
ADD COLUMN "payload" JSONB,
ADD COLUMN "scheduledAt" TIMESTAMP(3),
ADD COLUMN "nextAttemptAt" TIMESTAMP(3);

CREATE TABLE "NotificationTemplate" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "channel" "NotificationChannel" NOT NULL,
  "subject" TEXT,
  "bodyTemplate" TEXT NOT NULL,
  "metadata" JSONB,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkerJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "type" TEXT NOT NULL,
  "queue" TEXT NOT NULL,
  "status" "WorkerJobStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedAt" TIMESTAMP(3),
  "lockedBy" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkerJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationRule" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "triggerType" "AutomationTriggerType" NOT NULL,
  "scheduleCron" TEXT,
  "conditions" JSONB,
  "actions" JSONB NOT NULL,
  "status" "AutomationRuleStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReportRun" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "reportType" "ReportType" NOT NULL,
  "exportFormat" "ReportExportFormat" NOT NULL DEFAULT 'JSON',
  "filters" JSONB,
  "status" "ReportRunStatus" NOT NULL DEFAULT 'QUEUED',
  "result" JSONB,
  "exportObjectKey" TEXT,
  "requestedById" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ReportRun_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SyncClient"
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "appVersion" TEXT;

ALTER TABLE "SyncOperation"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "userId" TEXT,
ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "baseVersion" TIMESTAMP(3),
ADD COLUMN "clientMutationId" TEXT;

CREATE TABLE "SyncConflict" (
  "id" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "serverVersion" JSONB,
  "clientVersion" JSONB,
  "baseVersion" TIMESTAMP(3),
  "status" "SyncConflictStatus" NOT NULL DEFAULT 'OPEN',
  "resolution" "SyncConflictResolution",
  "resolvedById" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SyncConflict_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationTemplate_organizationId_key_channel_key" ON "NotificationTemplate" ("organizationId", "key", "channel");
CREATE INDEX notification_scheduled_idx ON "Notification" ("deliveryStatus", "scheduledAt", "nextAttemptAt");
CREATE INDEX worker_job_due_idx ON "WorkerJob" ("queue", "status", "runAt");
CREATE INDEX automation_rule_due_idx ON "AutomationRule" ("organizationId", "status", "nextRunAt");
CREATE INDEX report_run_status_idx ON "ReportRun" ("organizationId", "status", "createdAt");
CREATE INDEX sync_operation_org_status_idx ON "SyncOperation" ("organizationId", "status");
CREATE UNIQUE INDEX sync_operation_client_mutation_idx ON "SyncOperation" ("clientId", "clientMutationId") WHERE "clientMutationId" IS NOT NULL;
CREATE INDEX sync_conflict_status_idx ON "SyncConflict" ("organizationId", "status");
CREATE INDEX sync_conflict_entity_idx ON "SyncConflict" ("entityType", "entityId");

ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerJob" ADD CONSTRAINT "WorkerJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReportRun" ADD CONSTRAINT "ReportRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyncConflict" ADD CONSTRAINT "SyncConflict_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "SyncClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SyncConflict" ADD CONSTRAINT "SyncConflict_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
