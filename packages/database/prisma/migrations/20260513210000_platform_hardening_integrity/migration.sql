CREATE TABLE "OrganizationQuota" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "maxUsers" INTEGER NOT NULL DEFAULT 50,
  "maxStorageMb" INTEGER NOT NULL DEFAULT 10240,
  "maxMonthlyApiRequests" INTEGER NOT NULL DEFAULT 100000,
  "storageUsedMb" INTEGER NOT NULL DEFAULT 0,
  "apiRequestsThisMonth" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrganizationQuota_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiUsageEvent" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT,
  "route" TEXT NOT NULL,
  "method" TEXT NOT NULL,
  "statusCode" INTEGER NOT NULL,
  "durationMs" INTEGER NOT NULL,
  "requestId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ApiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationQuota_organizationId_key" ON "OrganizationQuota" ("organizationId");
CREATE INDEX api_usage_org_created_idx ON "ApiUsageEvent" ("organizationId", "createdAt");
CREATE INDEX api_usage_route_created_idx ON "ApiUsageEvent" ("route", "createdAt");

ALTER TABLE "OrganizationQuota" ADD CONSTRAINT "OrganizationQuota_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiUsageEvent" ADD CONSTRAINT "ApiUsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationQuota" ADD CONSTRAINT organization_quota_non_negative CHECK (
  "maxUsers" >= 0 AND "maxStorageMb" >= 0 AND "maxMonthlyApiRequests" >= 0
  AND "storageUsedMb" >= 0 AND "apiRequestsThisMonth" >= 0
);
