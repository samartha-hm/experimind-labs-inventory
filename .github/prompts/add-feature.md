---
description: Scaffold a full-stack feature end to end (entity, migration, service, route, UI, tests) following repo conventions
---

Scaffold a full-stack feature for NexaInventory ERP. Work through each layer in order, following this repository's conventions at every step:

1. **Entity** — Create or extend a TypeORM entity in `src/entity/`. Add `class-validator` decorators (`@IsString`, `@IsInt`, `@IsDateString`, ...) for every field that crosses the API boundary. Register the entity in `src/db.ts` `entities: [...]`.
2. **Migration** — Create `src/migration/<epoch-ms>-<PascalCaseName>.ts` (match the naming of existing files). Never edit an applied migration. Import it in `src/db.ts` and append it to the `migrations: [...]` array. Apply with `npm run db:migrate`.
3. **Service** — Put business logic in `src/services/` using the repository pattern (`AppDataSource.getRepository(Entity)`). Any stock-ledger, reservation, or quantity mutation must run inside a transaction with `pessimistic_write` locking (see `StockLedgerService` for the pattern).
4. **Route** — Expose it under `src/routes/`, mounted in `server.ts` under `/api/v1`. Validate input with a class-validator DTO at the route boundary; guard with `authenticate`/`requireRole` middleware as appropriate.
5. **UI** — Build the interface in `src/features/` (or `src/components/` for shared pieces) as React 19 function components using the design tokens in `src/index.css`. Include loading skeletons and empty states.
6. **Tests** — Add `src/**/__tests__/<name>.test.ts` covering the service and route logic with arrange-act-assert structure.

Before finishing: run `npm run typecheck`, the targeted vitest file(s) for the new tests, then the full `npm test`. Never edit files whose names end in " (1)".
