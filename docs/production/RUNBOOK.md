# Operations Runbook

## Daily Checks

- Check `/api/v1/health/ready`.
- Review failed worker jobs.
- Review open sync conflicts.
- Review backup files and restore-test latest backup in staging.

## Incident: API Error Spike

1. Filter structured logs by `requestId` and `level=error`.
2. Check `/api/v1/health/metrics`.
3. Check database and worker readiness.
4. Roll back the latest deployment if errors started after release.

## Incident: Queue Backlog

1. Check worker health details.
2. Scale worker replicas.
3. Review failed jobs and retry only idempotent job types.

## Incident: Sync Conflicts

1. Open Sync page.
2. Resolve simple inventory note conflicts with merge-safe fields.
3. Use server-wins or manual review for events, assignments, finance, expenses, and payroll.
