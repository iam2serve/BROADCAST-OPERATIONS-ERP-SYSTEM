# Recovery Procedures

## PostgreSQL

Backups are produced by `scripts/backup-postgres.sh` into `backups/postgres`.

Restore:

```sh
pg_restore -h <host> -U <user> -d broadcast_erp --clean --if-exists <backup.dump>
```

## Uploaded Files

Use object storage lifecycle replication or scheduled bucket sync. Restore files before restoring references that depend on them.

## Sync State

If desktop queue corruption is detected:

1. Run desktop queue recovery from the sync status layer.
2. Requeue `PROCESSING` rows to `QUEUED`.
3. Leave `SyncConflict` rows open for manual resolution.
4. Never auto-merge assignment, ledger, payroll, or expense conflicts.
