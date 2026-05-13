# Platform Foundation Architecture

## Monorepo

The repository uses `pnpm` workspaces and Turborepo.

- `apps/api`: NestJS REST API and business authority
- `apps/web`: Next.js web client
- `apps/desktop`: Tauri desktop client
- `packages/database`: Prisma schema, client exports, migrations
- `packages/config`: typed environment validation
- `packages/auth`: shared role and permission constants
- `packages/types`: shared API response contracts
- `packages/ui`: shared UI foundation

Dependency direction is one way: apps consume packages; packages do not import apps. The database package is intended for API/server-side use only.

## API Versioning

The API uses URI versioning behind the `/api` prefix:

- `/api/v1/health`
- `/api/v1/auth`
- `/api/v1/events`
- `/api/v1/assignments`

Breaking API changes must be introduced under a new URI version. Additive response fields can remain in the current version.

## Environment Configuration

Environment variables are validated through `@broadcast/config` using Zod. Startup should fail fast when required secrets, database URLs, storage settings, or security values are invalid.

## Database Migrations

Prisma owns portable schema migrations. PostgreSQL-only integrity features live in SQL under `packages/database/prisma/sql`.

The first generated Prisma migration should include:

- schema-created table definitions
- `btree_gist` extension
- assignment exclusion constraints
- partial indexes for active soft-deleted records

## Docker

Local Docker provides PostgreSQL, Redis, MinIO, API, and web services. Migrations are intentionally not hidden in app startup; they should be run as an explicit release step in staging and production.
