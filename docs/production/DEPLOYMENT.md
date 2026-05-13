# Production Deployment

## Environments

- `local`: developer workstation and demo deployments.
- `staging`: production-like validation environment.
- `production`: customer-facing deployment.

## Required Steps

1. Create environment secrets from `.env.example`.
2. Use unique `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `FIELD_ENCRYPTION_KEY`.
3. Run `pnpm --filter @broadcast/database prisma:migrate:deploy`.
4. Run `pnpm --filter @broadcast/database prisma:seed` for initial roles and permissions.
5. Start services with `docker compose --profile production up -d`.
6. Confirm `/api/v1/health/ready` returns `status: ok` or reviewed `degraded` details.

## Containers

- `api`: NestJS REST API.
- `web`: Next.js web app.
- `worker`: worker-ready API image for queue execution.
- `postgres`: PostgreSQL.
- `redis`: cache and distributed coordination foundation.
- `minio`: S3-compatible storage.
- `backup`: scheduled PostgreSQL backup foundation.
