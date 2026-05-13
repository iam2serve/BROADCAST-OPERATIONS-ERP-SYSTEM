# Broadcast Operations ERP System

Production-grade monorepo foundation for a broadcast operations ERP platform.

## Workspace

- `apps/api`: NestJS API foundation
- `apps/web`: Next.js web foundation
- `apps/desktop`: Tauri desktop foundation
- `packages/database`: Prisma schema and PostgreSQL integrity SQL
- `packages/config`: Zod environment validation
- `packages/auth`: shared role, permission, and auth contracts
- `packages/types`: API response types and shared enums
- `packages/ui`: shared UI package foundation

## Foundation Features

- pnpm workspace with Turborepo pipelines
- shared TypeScript, ESLint, and Prettier configuration
- NestJS API versioning, validation, request IDs, structured logging, security middleware, and health endpoint
- Next.js Tailwind/ShadCN-ready shell with TanStack Query and role-aware navigation foundation
- Tauri shell with SQLite bootstrap, sync queue skeleton, and token storage abstraction
- Prisma schema for the production domain foundation
- PostgreSQL extension and exclusion-constraint SQL for assignment conflict prevention
- Docker Compose for PostgreSQL, Redis, MinIO, API, and web

## Local Setup

Install pnpm through Corepack or your preferred package manager, then run:

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Copy `.env.example` to `.env` before running API or Docker services.

## Database

Prisma migrations create the portable schema. PostgreSQL-specific constraints live in `packages/database/prisma/sql`.

Assignment overlap prevention is enforced by database exclusion constraints for operators, devices, routers, and SIM cards.

## Development Boundary

This repository currently contains the platform foundation only. Business modules such as users, events, finance, inventory workflows, and assignment services are intentionally not implemented yet.
