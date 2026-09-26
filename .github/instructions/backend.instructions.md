---
applyTo:
  - "server.ts"
  - "src/db.ts"
  - "src/routes/**"
  - "src/services/**"
  - "src/entity/**"
  - "src/middleware/**"
  - "src/migration/**"
  - "src/workers/**"
---

# Backend conventions (Express + TypeORM + PostgreSQL)

## Route boundaries
- Validate and transform all input at the route boundary with class-validator / class-transformer DTOs before it reaches a service.
- Guard mutating routes with `authenticateJwt`; use `requireTenant` for tenant-scoped data and `requireRole` for privileged operations.
- Keep routes thin: parse/validate → call a service → map the response. Business logic belongs in `src/services/`.
- Return consistent error shapes through the central `errorHandler`; never leak stack traces or SQL errors to clients.

## Stock ledger & concurrency
- The stock ledger is immutable: append ledger entries; never update or delete them.
- Wrap every mutation of inventory quantities in a TypeORM transaction with pessimistic locking, following the existing pattern: `manager.transaction(...)` with `lock: { mode: "pessimistic_write" }` or `.setLock("pessimistic_write")` (see `StockLedgerService`, `CartReservationService`, `PurchaseOrderService`).
- Acquire the row lock before reading balances, and keep transactions short.

## TypeORM
- Use repositories / query builders; never build SQL by string concatenation (injection risk).
- New tables or columns → new entity in `src/entity/` plus a migration in `src/migration/`.
- **Never edit an applied migration** — create a new one instead. Migrations run via `npm run db:migrate` (`tsx scripts/run-migrations.ts`).

## Workers
- Background jobs live in `src/workers/` (e.g. `reservationReaper`). They must be idempotent and safe to run concurrently with API traffic.
