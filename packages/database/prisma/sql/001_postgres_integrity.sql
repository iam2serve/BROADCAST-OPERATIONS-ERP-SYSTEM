CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "EventDeviceAssignment"
ADD CONSTRAINT event_device_assignment_valid_range
CHECK ("endsAt" > "startsAt");

ALTER TABLE "EventSimAssignment"
ADD CONSTRAINT event_sim_assignment_valid_range
CHECK ("endsAt" > "startsAt");

ALTER TABLE "EventRouterAssignment"
ADD CONSTRAINT event_router_assignment_valid_range
CHECK ("endsAt" > "startsAt");

ALTER TABLE "EventOperatorAssignment"
ADD CONSTRAINT event_operator_assignment_valid_range
CHECK ("endsAt" > "startsAt");

ALTER TABLE "EventDeviceAssignment"
ADD CONSTRAINT event_device_no_overlap
EXCLUDE USING gist (
  "deviceId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventSimAssignment"
ADD CONSTRAINT event_sim_no_overlap
EXCLUDE USING gist (
  "simId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventRouterAssignment"
ADD CONSTRAINT event_router_no_overlap
EXCLUDE USING gist (
  "routerId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

ALTER TABLE "EventOperatorAssignment"
ADD CONSTRAINT event_operator_no_overlap
EXCLUDE USING gist (
  "operatorId" WITH =,
  tstzrange("startsAt", "endsAt", '[)') WITH &&
)
WHERE ("status" IN ('RESERVED', 'ACTIVE'));

CREATE INDEX IF NOT EXISTS organization_active_idx
ON "Organization" ("id")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS branch_active_by_org_idx
ON "Branch" ("organizationId", "id")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS user_active_by_org_email_idx
ON "User" ("organizationId", "email")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS event_active_by_org_status_idx
ON "Event" ("organizationId", "status", "startsAt")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS device_active_by_org_status_idx
ON "BroadcastDevice" ("organizationId", "status")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS sim_active_by_org_status_idx
ON "SimCard" ("organizationId", "status")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS router_active_by_org_status_idx
ON "Router" ("organizationId", "status")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS operator_active_by_org_status_idx
ON "OperatorProfile" ("organizationId", "status")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS expense_active_by_org_status_idx
ON "Expense" ("organizationId", "status", "createdAt")
WHERE "deletedAt" IS NULL;
