# Test Evidence — source handover 2026-10-08

- `npm run test:erp-core` (or equivalent `node --experimental-strip-types --test ...`) **13/13 PASS** on Node v22.16.0.
- Isolated module `tsc --noEmit --target ES2022 --module node16 --moduleResolution node16 src/domain/requirements/calculateProjectDemand.ts` **PASS**.
- Full `npm run typecheck` baseline **not validated**: missing installed node_modules / missing `express` and `react` types; initial error TS2307.
- Full npm test, full app build, live PostgreSQL migrations, runtime route authorization and end-to-end browser tests **not run**.
- `git status` cannot be checked in the provided ZIP because no `.git` history was included.
