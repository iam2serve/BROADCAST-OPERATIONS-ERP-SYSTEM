# Broadcast Operations ERP Foundation

## Identity Model

Every operator is a user with exactly one `OperatorProfile`. Not every user is an operator. Finance, admin, management, and viewer accounts may exist with no operator profile.

## Sensitive Data

Sensitive fields are encrypted in the application before persistence using AES-256-GCM. Encrypted columns store ciphertext only, with a companion key-version field for rotation. Sensitive values must never be emitted in logs, audit payloads, or API responses unless the caller has an explicit permission.

Covered fields include router WiFi passwords, SIM credentials, external API keys, and future provider secrets.

## Assignment Integrity

The API validates availability before writing assignments for clear user errors. PostgreSQL exclusion constraints remain the final authority and prevent overlapping `RESERVED` or `ACTIVE` assignments for operators, devices, routers, and SIM cards.

`COMPLETED`, `RELEASED`, and `CANCELLED` assignments remain historical and do not block future use.

## Soft Deletes

Business entities use `deletedAt`. Query helpers must exclude deleted rows by default. PostgreSQL partial indexes optimize active-record reads by filtering `deletedAt IS NULL` for high-volume operational tables.

## Event Timeline

`EventActivityLog` is the operational trace for event debugging. It records event creation, assignments, releases, expense submission and approval, schedule changes, and other business events with actor, entity reference, request ID, and metadata.

Audit logs remain system-wide and immutable; event timeline logs are event-focused and optimized for operational support.
