CREATE INDEX IF NOT EXISTS user_invitation_active_by_email_idx
ON "UserInvitation" ("organizationId", lower("email"), "expiresAt")
WHERE "acceptedAt" IS NULL AND "revokedAt" IS NULL;

CREATE INDEX IF NOT EXISTS user_preferences_by_user_idx
ON "UserPreferences" ("userId");

CREATE INDEX IF NOT EXISTS operator_active_by_user_idx
ON "OperatorProfile" ("userId")
WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS user_status_by_org_idx
ON "User" ("organizationId", "status")
WHERE "deletedAt" IS NULL;
