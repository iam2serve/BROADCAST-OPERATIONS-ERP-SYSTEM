CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TYPE "EventStatus" RENAME TO "EventStatus_old";
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PLANNED', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
ALTER TABLE "Event" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Event" ALTER COLUMN "status" TYPE "EventStatus" USING ("status"::text::"EventStatus");
DROP TYPE "EventStatus_old";
ALTER TABLE "Event" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

ALTER TYPE "AssetType" RENAME TO "AssetType_old";
CREATE TYPE "AssetType" AS ENUM ('DEVICE', 'SIM', 'ROUTER', 'OPERATOR');
ALTER TABLE "AssetTelemetryMetric" ALTER COLUMN "assetType" TYPE "AssetType" USING ("assetType"::text::"AssetType");
ALTER TABLE "AssetOwnershipHistory" ALTER COLUMN "assetType" TYPE "AssetType" USING ("assetType"::text::"AssetType");
DROP TYPE "AssetType_old";

ALTER TABLE "Event"
ADD COLUMN "isDraft" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "eventColor" TEXT,
ADD COLUMN "eventTag" TEXT,
ADD COLUMN "cooldownBeforeMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "cooldownAfterMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "estimatedCrewSize" INTEGER;

ALTER TABLE "EventOperatorAssignment"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "effectiveStartsAt" TIMESTAMP(3),
ADD COLUMN "effectiveEndsAt" TIMESTAMP(3),
ADD COLUMN "assignedById" TEXT,
ADD COLUMN "releasedById" TEXT,
ADD COLUMN "releasedAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

ALTER TABLE "EventDeviceAssignment"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "effectiveStartsAt" TIMESTAMP(3),
ADD COLUMN "effectiveEndsAt" TIMESTAMP(3),
ADD COLUMN "assignedById" TEXT,
ADD COLUMN "releasedById" TEXT,
ADD COLUMN "releasedAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

ALTER TABLE "EventSimAssignment"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "effectiveStartsAt" TIMESTAMP(3),
ADD COLUMN "effectiveEndsAt" TIMESTAMP(3),
ADD COLUMN "assignedById" TEXT,
ADD COLUMN "releasedById" TEXT,
ADD COLUMN "releasedAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

ALTER TABLE "EventRouterAssignment"
ADD COLUMN "organizationId" TEXT,
ADD COLUMN "branchId" TEXT,
ADD COLUMN "effectiveStartsAt" TIMESTAMP(3),
ADD COLUMN "effectiveEndsAt" TIMESTAMP(3),
ADD COLUMN "assignedById" TEXT,
ADD COLUMN "releasedById" TEXT,
ADD COLUMN "releasedAt" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

UPDATE "EventOperatorAssignment" a
SET "organizationId" = e."organizationId", "branchId" = e."branchId", "effectiveStartsAt" = a."startsAt", "effectiveEndsAt" = a."endsAt"
FROM "Event" e WHERE e."id" = a."eventId";

UPDATE "EventDeviceAssignment" a
SET "organizationId" = e."organizationId", "branchId" = e."branchId", "effectiveStartsAt" = a."startsAt", "effectiveEndsAt" = a."endsAt"
FROM "Event" e WHERE e."id" = a."eventId";

UPDATE "EventSimAssignment" a
SET "organizationId" = e."organizationId", "branchId" = e."branchId", "effectiveStartsAt" = a."startsAt", "effectiveEndsAt" = a."endsAt"
FROM "Event" e WHERE e."id" = a."eventId";

UPDATE "EventRouterAssignment" a
SET "organizationId" = e."organizationId", "branchId" = e."branchId", "effectiveStartsAt" = a."startsAt", "effectiveEndsAt" = a."endsAt"
FROM "Event" e WHERE e."id" = a."eventId";

ALTER TABLE "EventOperatorAssignment"
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "effectiveStartsAt" SET NOT NULL,
ALTER COLUMN "effectiveEndsAt" SET NOT NULL;

ALTER TABLE "EventDeviceAssignment"
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "effectiveStartsAt" SET NOT NULL,
ALTER COLUMN "effectiveEndsAt" SET NOT NULL;

ALTER TABLE "EventSimAssignment"
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "effectiveStartsAt" SET NOT NULL,
ALTER COLUMN "effectiveEndsAt" SET NOT NULL;

ALTER TABLE "EventRouterAssignment"
ALTER COLUMN "organizationId" SET NOT NULL,
ALTER COLUMN "effectiveStartsAt" SET NOT NULL,
ALTER COLUMN "effectiveEndsAt" SET NOT NULL;

CREATE TABLE "AssetMaintenanceWindow" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "branchId" TEXT,
  "assetType" "AssetType" NOT NULL,
  "assetId" TEXT NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "reason" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AssetMaintenanceWindow_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Event"
ADD CONSTRAINT event_valid_schedule
CHECK ("endsAt" > "startsAt");

ALTER TABLE "Event"
ADD CONSTRAINT event_non_negative_cooldown
CHECK ("cooldownBeforeMinutes" >= 0 AND "cooldownAfterMinutes" >= 0);

ALTER TABLE "EventOperatorAssignment"
ADD CONSTRAINT event_operator_effective_valid_range
CHECK ("endsAt" > "startsAt" AND "effectiveEndsAt" > "effectiveStartsAt");

ALTER TABLE "EventDeviceAssignment"
ADD CONSTRAINT event_device_effective_valid_range
CHECK ("endsAt" > "startsAt" AND "effectiveEndsAt" > "effectiveStartsAt");

ALTER TABLE "EventSimAssignment"
ADD CONSTRAINT event_sim_effective_valid_range
CHECK ("endsAt" > "startsAt" AND "effectiveEndsAt" > "effectiveStartsAt");

ALTER TABLE "EventRouterAssignment"
ADD CONSTRAINT event_router_effective_valid_range
CHECK ("endsAt" > "startsAt" AND "effectiveEndsAt" > "effectiveStartsAt");

ALTER TABLE "AssetMaintenanceWindow"
ADD CONSTRAINT asset_maintenance_window_valid_range
CHECK ("endsAt" > "startsAt");

ALTER TABLE "EventOperatorAssignment"
DROP CONSTRAINT IF EXISTS event_operator_no_overlap;

ALTER TABLE "EventDeviceAssignment"
DROP CONSTRAINT IF EXISTS event_device_no_overlap;

ALTER TABLE "EventSimAssignment"
DROP CONSTRAINT IF EXISTS event_sim_no_overlap;

ALTER TABLE "EventRouterAssignment"
DROP CONSTRAINT IF EXISTS event_router_no_overlap;

ALTER TABLE "EventOperatorAssignment"
ADD CONSTRAINT event_operator_no_overlap
EXCLUDE USING gist (
  "operatorId" WITH =,
  tstzrange("effectiveStartsAt", "effectiveEndsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventDeviceAssignment"
ADD CONSTRAINT event_device_no_overlap
EXCLUDE USING gist (
  "deviceId" WITH =,
  tstzrange("effectiveStartsAt", "effectiveEndsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventSimAssignment"
ADD CONSTRAINT event_sim_no_overlap
EXCLUDE USING gist (
  "simId" WITH =,
  tstzrange("effectiveStartsAt", "effectiveEndsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventRouterAssignment"
ADD CONSTRAINT event_router_no_overlap
EXCLUDE USING gist (
  "routerId" WITH =,
  tstzrange("effectiveStartsAt", "effectiveEndsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

CREATE INDEX IF NOT EXISTS event_active_schedule_idx
ON "Event" ("organizationId", "startsAt", "endsAt")
WHERE "deletedAt" IS NULL AND "status" IN ('PLANNED', 'CONFIRMED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS event_timeline_recent_idx
ON "EventActivityLog" ("eventId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS operator_assignment_active_idx
ON "EventOperatorAssignment" ("organizationId", "operatorId", "effectiveStartsAt", "effectiveEndsAt")
WHERE "status" IN ('RESERVED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS device_assignment_active_idx
ON "EventDeviceAssignment" ("organizationId", "deviceId", "effectiveStartsAt", "effectiveEndsAt")
WHERE "status" IN ('RESERVED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS sim_assignment_active_idx
ON "EventSimAssignment" ("organizationId", "simId", "effectiveStartsAt", "effectiveEndsAt")
WHERE "status" IN ('RESERVED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS router_assignment_active_idx
ON "EventRouterAssignment" ("organizationId", "routerId", "effectiveStartsAt", "effectiveEndsAt")
WHERE "status" IN ('RESERVED', 'ACTIVE');

CREATE INDEX IF NOT EXISTS asset_maintenance_window_active_idx
ON "AssetMaintenanceWindow" ("organizationId", "assetType", "assetId", "startsAt", "endsAt");
