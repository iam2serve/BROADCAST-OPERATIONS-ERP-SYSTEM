# Migration Foundation

This project uses Prisma migrations for table creation and raw SQL migrations for PostgreSQL-specific integrity features that Prisma cannot express.

Initial production sequence:

1. Generate the first Prisma migration from `prisma/schema.prisma`.
2. Add the SQL in `packages/database/prisma/sql/001_postgres_integrity.sql` to the same migration after Prisma table creation SQL, or as the immediately following migration.
3. Apply migrations with `pnpm db:migrate:deploy` in staging and production.

Do not use `prisma db push` outside disposable local development databases.
