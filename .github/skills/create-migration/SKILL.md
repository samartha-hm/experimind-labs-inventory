---
name: create-migration
description: Safely create and apply a TypeORM schema migration for the PostgreSQL database. Use when adding or changing entities, columns, indexes, or constraints in src/entity.
---

# Create a TypeORM migration

Schema changes go through migrations — `synchronize` is disabled and the database schema is migration-controlled.

## Steps

1. **Confirm the schema change** — Identify the entity change in `src/entity/` that needs a migration. Never edit an already-applied migration file; always create a new one.
2. **Create the migration file** — Add `src/migration/<epoch-ms>-<PascalCaseName>.ts` following the existing naming (e.g. `1689500000015-AddReservedQuantity.ts`). Implement `up()` with the `QueryRunner` operations and `down()` with the inverse.
3. **Register it** — Import the migration class in `src/db.ts` and append it to the `migrations: [...]` array, in order.
4. **Apply it** — Run `npm run db:migrate` and confirm the output lists your migration as executed.
5. **Handle data, not just schema** — If the change mutates existing rows, do it inside the migration within a transaction and keep it idempotent so re-runs are safe.
6. **Verify** — Run `npm run typecheck`, then `npm test` (needs PostgreSQL plus `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET`). Confirm entities and migration stay in sync.

## Rules

- Never edit a migration that has run anywhere (shared dev/prod databases) — create a new one instead.
- Never enable `synchronize` as a shortcut.
- Destructive operations (drop column/table) require explicit user confirmation first.
