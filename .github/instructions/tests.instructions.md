---
applyTo:
  - "**/*.test.ts"
  - "src/**/__tests__/**"
---

# Test conventions (Vitest)

## Location & format
- Tests live in `__tests__/` folders beside the code under `src/` (e.g. `src/services/__tests__/stockLedger.test.ts`).
- Vitest runs with `globals: true` in the node environment — no DOM rendering; test services, routes, and utilities directly.

## Environment
- Integration tests need PostgreSQL and env vars: `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET` (CI values in `.github/workflows/ci.yml`).

## Writing tests
- Structure every test as arrange-act-assert; one behavior per test; use descriptive, requirement-style names.
- Prefer targeted test files next to the module over one giant suite.
- Never modify non-test source to make a test pass — if the code is wrong, report it.

## Running
- Full suite: `npm test` (vitest run).
- Single file: `npx vitest run src/services/__tests__/stockLedger.test.ts`.
- Filter by name: `npx vitest run -t "reserves stock"`.
