---
name: verify-changes
description: Step-by-step verification workflow for any change in this repo — typecheck, targeted tests, full suite, build — with terminal evidence. Use before declaring any task complete.
---

# Verify changes

Never claim success without terminal output. Follow these gates in order; stop and report on the first failure.

1. **Typecheck**: run `npm run typecheck`. Fix all errors before continuing.
2. **Targeted tests**: run the tests covering the code you touched, e.g. `npx vitest run src/services/__tests__/stockLedger.test.ts`. Integration tests need PostgreSQL and `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET`.
3. **Full suite**: run `npm test`.
4. **Build**: run `npm run build` (Vite client build + esbuild server bundle).

## Report format
End with a pass/fail summary:

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | pass/fail |
| Targeted tests | `npx vitest run <files>` | pass/fail |
| Full suite | `npm test` | pass/fail |
| Build | `npm run build` | pass/fail |

If a gate cannot run (e.g. no PostgreSQL locally), say so explicitly — an unrun gate is a fail, not a pass.
