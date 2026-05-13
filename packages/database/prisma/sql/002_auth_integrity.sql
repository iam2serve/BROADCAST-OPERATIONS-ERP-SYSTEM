CREATE INDEX IF NOT EXISTS session_active_by_user_idx
ON "Session" ("userId", "expiresAt")
WHERE "revokedAt" IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_active_by_user_idx
ON "PasswordResetToken" ("userId", "expiresAt")
WHERE "usedAt" IS NULL;

CREATE INDEX IF NOT EXISTS audit_log_auth_actions_idx
ON "AuditLog" ("action", "createdAt")
WHERE "action" IN (
  'auth.login',
  'auth.logout',
  'auth.login_failed',
  'auth.password_reset_requested',
  'auth.session_revoked'
);
