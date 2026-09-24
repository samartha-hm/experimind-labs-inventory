---
description: Write or improve Vitest tests for a specific service, route, or component
---

Write Vitest tests for the target code in this repository:

1. **Locate conventions** — Tests live in `src/**/__tests__/*.test.ts`, colocated with the code under test. Read an existing test in the same area first (e.g. `src/services/__tests__/stockLedger.test.ts`) and mirror its setup/teardown.
2. **Environment** — Integration tests need PostgreSQL and env vars: `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET` (see `.github/workflows/ci.yml`). Never commit real credentials.
3. **Structure** — One test file per unit. `describe` blocks per behavior, `it` names as sentences. Arrange-act-assert inside every test; keep tests independent and idempotent (clean up rows you create).
4. **Coverage** — Target the public surface: happy path, boundary values, validation failures, and error handling. For services with transactions, cover the concurrency and integrity guards.
5. **Run** — Targeted first: `npx vitest run src/services/__tests__/<file>.test.ts`. Then the full suite: `npm test`. Then `npm run typecheck`.

Report which behaviors are covered and list any remaining gaps. Never modify non-test source to make a test pass, and never edit files whose names end in " (1)".
