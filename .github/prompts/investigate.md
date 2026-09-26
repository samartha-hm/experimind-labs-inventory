---
description: Root-cause investigation workflow — reproduce a bug, gather evidence, trace the code path, verify the hypothesis with a test, then propose the minimal fix.
---

# Investigate a bug

1. **Reproduce**: reproduce the failure with the smallest possible command or request. If it cannot be reproduced, say so and stop — do not fix what you cannot see.
2. **Gather evidence**: collect logs, HTTP status/response, and database state (entity rows, ledger entries) around the failure. Tests need `NODE_ENV=test`, `DATABASE_URL`, `JWT_SECRET` and PostgreSQL.
3. **Trace the code path**: follow the route → middleware → service → entity chain (start at `server.ts` / `src/routes/v1/`). Note transaction and lock boundaries (`pessimistic_write`) whenever behavior involves stock.
4. **Form a hypothesis**: state the single most likely root cause and the evidence supporting it.
5. **Verify with a test**: write a failing test in the matching `__tests__/` folder that demonstrates the bug. A hypothesis without a reproducing test is unverified.
6. **Propose the minimal fix**: describe the smallest change that makes the test pass, listing exact files. Do not refactor beyond the fix.
