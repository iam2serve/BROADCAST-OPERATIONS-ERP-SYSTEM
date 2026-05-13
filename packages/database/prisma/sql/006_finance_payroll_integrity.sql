ALTER TYPE "ExpenseStatus" RENAME TO "ExpenseStatus_old";
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REIMBURSED');
ALTER TABLE "Expense" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Expense" ALTER COLUMN "status" TYPE "ExpenseStatus" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'SUBMITTED'
    ELSE "status"::text
  END::"ExpenseStatus"
);
DROP TYPE "ExpenseStatus_old";
ALTER TABLE "Expense" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TYPE "ExpenseCategory" RENAME TO "ExpenseCategory_old";
CREATE TYPE "ExpenseCategory" AS ENUM ('FUEL', 'FOOD', 'HOTEL', 'TRANSPORTATION', 'INTERNET', 'SIM_RECHARGE', 'REPAIR', 'EMERGENCY', 'MISC');
ALTER TABLE "Expense" ALTER COLUMN "category" TYPE "ExpenseCategory" USING (
  CASE "category"::text
    WHEN 'REPAIRS' THEN 'REPAIR'
    WHEN 'MISCELLANEOUS' THEN 'MISC'
    ELSE "category"::text
  END::"ExpenseCategory"
);
DROP TYPE "ExpenseCategory_old";

ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'DEDUCTION';
ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'PAYROLL_PAYOUT';

CREATE TYPE "PayrollPeriodStatus" AS ENUM ('OPEN', 'PROCESSING', 'FINALIZED', 'CANCELLED');
CREATE TYPE "PayoutStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID', 'CANCELLED');
CREATE TYPE "PayrollAdjustmentType" AS ENUM ('ADVANCE', 'DEDUCTION', 'OVERTIME', 'BONUS');
CREATE TYPE "FinancialLockType" AS ENUM ('EVENT', 'PAYROLL_PERIOD');

ALTER TABLE "Expense"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP',
ADD COLUMN "submittedAt" TIMESTAMP(3),
ADD COLUMN "reviewedAt" TIMESTAMP(3),
ADD COLUMN "reimbursedAt" TIMESTAMP(3),
ADD COLUMN "approvalMetadata" JSONB,
ADD COLUMN "reimbursementMetadata" JSONB,
ADD COLUMN "ocrMetadata" JSONB,
ADD COLUMN "reviewedById" TEXT,
ADD COLUMN "reimbursedById" TEXT;

ALTER TABLE "FinancialTransaction"
ADD COLUMN "payrollPayoutId" TEXT,
ADD COLUMN "payrollAdjustmentId" TEXT,
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP',
ADD COLUMN "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "finalizedAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

ALTER TABLE "LedgerEntry"
ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'EGP';

CREATE TABLE "SalaryProfile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "operatorId" TEXT NOT NULL,
  "salaryType" "SalaryType" NOT NULL,
  "dailyRate" DECIMAL(14,2),
  "eventRate" DECIMAL(14,2),
  "monthlyRate" DECIMAL(14,2),
  "overtimeRate" DECIMAL(14,2),
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "effectiveFrom" TIMESTAMP(3) NOT NULL,
  "effectiveTo" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "SalaryProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollPeriod" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "name" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "status" "PayrollPeriodStatus" NOT NULL DEFAULT 'OPEN',
  "finalizedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollPeriod_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollPayout" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "payrollPeriodId" TEXT NOT NULL,
  "operatorId" TEXT NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "status" "PayoutStatus" NOT NULL DEFAULT 'DRAFT',
  "paidAt" TIMESTAMP(3),
  "notes" TEXT,
  "metadata" JSONB,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PayrollPayout_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PayrollAdjustment" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "payrollPeriodId" TEXT,
  "operatorId" TEXT NOT NULL,
  "type" "PayrollAdjustmentType" NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayrollAdjustment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EventFinancialSnapshot" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "estimatedBudget" DECIMAL(14,2),
  "estimatedRevenue" DECIMAL(14,2),
  "actualExpenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "actualPayouts" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "actualRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "actualProfit" DECIMAL(14,2) NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'EGP',
  "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventFinancialSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FinancialLock" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "eventId" TEXT,
  "payrollPeriodId" TEXT,
  "lockType" "FinancialLockType" NOT NULL,
  "reason" TEXT,
  "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lockedById" TEXT NOT NULL,
  CONSTRAINT "FinancialLock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FinancialTransaction_payrollPayoutId_key" ON "FinancialTransaction" ("payrollPayoutId");
CREATE UNIQUE INDEX "FinancialTransaction_payrollAdjustmentId_key" ON "FinancialTransaction" ("payrollAdjustmentId");
CREATE INDEX IF NOT EXISTS expense_workflow_idx ON "Expense" ("organizationId", "status", "submittedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS salary_profile_operator_idx ON "SalaryProfile" ("organizationId", "operatorId") WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS payroll_period_schedule_idx ON "PayrollPeriod" ("organizationId", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS payroll_payout_status_idx ON "PayrollPayout" ("organizationId", "status");
CREATE INDEX IF NOT EXISTS financial_transaction_posted_idx ON "FinancialTransaction" ("organizationId", "postedAt");
CREATE INDEX IF NOT EXISTS ledger_entry_account_idx ON "LedgerEntry" ("accountCode", "createdAt");
CREATE INDEX IF NOT EXISTS event_financial_snapshot_recent_idx ON "EventFinancialSnapshot" ("eventId", "calculatedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS financial_lock_event_unique_idx ON "FinancialLock" ("eventId") WHERE "lockType" = 'EVENT' AND "eventId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS financial_lock_payroll_period_unique_idx ON "FinancialLock" ("payrollPeriodId") WHERE "lockType" = 'PAYROLL_PERIOD' AND "payrollPeriodId" IS NOT NULL;

ALTER TABLE "SalaryProfile" ADD CONSTRAINT "SalaryProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalaryProfile" ADD CONSTRAINT "SalaryProfile_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SalaryProfile" ADD CONSTRAINT "SalaryProfile_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT "PayrollPeriod_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollPayout" ADD CONSTRAINT "PayrollPayout_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayout" ADD CONSTRAINT "PayrollPayout_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollPayout" ADD CONSTRAINT "PayrollPayout_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayout" ADD CONSTRAINT "PayrollPayout_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollPayout" ADD CONSTRAINT "PayrollPayout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "OperatorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT "PayrollAdjustment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EventFinancialSnapshot" ADD CONSTRAINT "EventFinancialSnapshot_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialLock" ADD CONSTRAINT "FinancialLock_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinancialLock" ADD CONSTRAINT "FinancialLock_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialLock" ADD CONSTRAINT "FinancialLock_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "PayrollPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialLock" ADD CONSTRAINT "FinancialLock_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_reimbursedById_fkey" FOREIGN KEY ("reimbursedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_payrollPayoutId_fkey" FOREIGN KEY ("payrollPayoutId") REFERENCES "PayrollPayout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_payrollAdjustmentId_fkey" FOREIGN KEY ("payrollAdjustmentId") REFERENCES "PayrollAdjustment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense" ADD CONSTRAINT expense_positive_amount CHECK ("amount" > 0);
ALTER TABLE "PayrollPayout" ADD CONSTRAINT payroll_payout_positive_amount CHECK ("amount" > 0);
ALTER TABLE "PayrollAdjustment" ADD CONSTRAINT payroll_adjustment_positive_amount CHECK ("amount" > 0);
ALTER TABLE "PayrollPeriod" ADD CONSTRAINT payroll_period_valid_range CHECK ("endsAt" > "startsAt");
ALTER TABLE "FinancialLock" ADD CONSTRAINT financial_lock_has_scope CHECK (
  ("lockType" = 'EVENT' AND "eventId" IS NOT NULL AND "payrollPeriodId" IS NULL)
  OR ("lockType" = 'PAYROLL_PERIOD' AND "payrollPeriodId" IS NOT NULL AND "eventId" IS NULL)
);
