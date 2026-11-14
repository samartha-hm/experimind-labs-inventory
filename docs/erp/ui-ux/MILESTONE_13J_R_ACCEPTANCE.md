# Milestone 13J-R acceptance — 2026-10-17

Result: PASS for bounded automated full-server acceptance using the existing watcher/HMR recovery setting. This supersedes the two automated blockers in 13J. Physical-device, staff and assistive-device acceptance remain pending. One 320px automated contrast check needs manual review.

## Request boundary and recovery

Two diagnostic approaches were used, without repeated identical requests:

1. Existing full `server.ts` startup, normal Vite watcher/HMR, isolated PostgreSQL already listening on 127.0.0.1:55432. Logs confirmed database connection, reaper registration and listening on 3101. A five-second bounded curl returned `/health` 200 in 3.578399s, but `/` timed out with status 000 after 5.012988s. The server process remained alive with high CPU and no stderr exception. There was no competing listener or missing database startup to resolve.
2. Restart the same full server with existing `DISABLE_HMR=true`, which sets Vite HMR false and watch null. `/` returned 200 in 0.047799s and `/health` 200 in 0.009859s. Authenticated browser and API requests then completed against the full Express/Vite application. A later source-reload restart returned `/` 200 in 0.021574s; flag-off restart returned 200 in 0.006773s.

The confirmed boundary is the normal watcher/HMR path in this environment. Its internal cause is unresolved; investigation stopped at the two-approach limit. No authentication, proxy, database, tenant or application-rendering bypass was introduced. Direct browser acceptance used port 3101, without the previous built-frontend router harness.

Recovery from the repository directory in PowerShell (retain the existing isolated PostgreSQL; do not start a second instance):

```powershell
$env:PORT='3101'
$env:HOST='127.0.0.1'
$env:DISABLE_HMR='true'
$env:PROJECTS_WORKSPACE_READ_ONLY='true'
$env:PROJECTS_WORKSPACE_ORGANIZATIONS='87da377f-688c-4cad-b146-1e49f286e3b3'
node --env-file=.env.kit-builder-development --import tsx server.ts
```

The allowlist identifies retained synthetic development records only. Restart after source edits because watching is disabled. Stop only the process started for this task before restarting; do not kill arbitrary listeners. Use `curl.exe --max-time 5` for bounded readiness checks. Set `PROJECTS_WORKSPACE_READ_ONLY=false` before restart for rollback. No tracked environment configuration changed.

## Responsive correction and browser evidence

The earlier 625px phone document width was caused by the test proxy's unwrapped audit JSON, not the workspace. The audit output now wraps. Actual application inspection also found a narrow table caption: at 320px it was 8.29px wide and approximately 648px high. The existing stacked-table mobile representation now includes its semantic caption in the full-width block layout. After correction the caption is 214.4px wide and approximately 36px high. Quantities and their per-cell labels remain visible; content is not hidden to pass overflow checks.

Authenticated Edge against full server + retained synthetic PostgreSQL:

| Viewport | Document scroll width | Scoped axe violations / incomplete |
| --- | --- | --- |
| 320 × 800 | 305px (320px including scrollbar) | 0 / 1 (`color-contrast`, manual review) |
| 360 × 800 | 345px | 0 / 0 |
| 390 × 844 | 375px | 0 / 0 |
| 768 × 1024 | 753px | 0 / 0 |
| 1280 × 720 | 1265px | 0 / 0 |

The latter four audits each passed 31 rules; 320px passed 30. Audits cover the Projects workspace, WCAG A/AA/2.1 AA and best-practice tags, not certification of the entire legacy shell. All five widths had no document overflow. Direct port-3101 confirmation at 320px also measured 305px document width and the corrected 214.4px caption, with no console warnings/errors returned.

Checks covered navigation/context header, project list/search, saved subject/grade/requested/complete-set columns, revision actors and kit provenance expanded, UUIDs and long retained project/kit labels, status indicators, school filter and empty state. Keyboard Enter expands school details. School A's saved grade requests are 2/2/2 with explicit complete sets 2; School B shows 3 and explicitly unknown quantities, with explicit bundle zero. Switching schools preserves project identity. Refresh preserves expanded School B and provenance context. Mobile navigation drawer opens/closes by keyboard without document overflow (320px). Workspace details are inline; no new dialogs or drawers were introduced. Arbitrary extreme names and exhaustive operational state combinations were not seeded.

The optional loopback 3102 proxy forwards to the same full server solely to inject axe and controlled read failures. A synthetic 403 and a forwarded-then-dropped response displayed explicit errors while retaining the selected project/school; retry restored authorized records without claiming a write. Error states remained within the phone viewport. These checks supplement, rather than replace, direct full-server acceptance.

## Security, reconciliation and rollback

- Focused React + actual HTTP/PostgreSQL tests: 16/16. Tenant denial, unauthenticated/current-role/inactive/viewer restrictions, flag boundaries, mutation denial, revision protection and legacy response equality remain covered. No authorization rules changed.
- Six retained synthetic projects, two schools each, reconcile project/history/preview responses exactly to existing services. The validator now bounds each HTTP fetch to eight seconds and supports a separate evidence directory.
- All 83 public business-table count/content fingerprints, including audit logs, remained identical before/after browser reads, full tests and actual flag-off rollback. Only users/refresh_tokens/auth_sessions are excluded because authentication updates them. No inventory, reservation, QC, dispatch, requirement or business-audit mutation occurred.
- Actual full-server flag-off restart: workspace access `{enabled:false}`, workspace list HTTP 404, legacy projects identical. Fresh browser authentication displayed “Projects workspace unavailable. Legacy Projects remains available.” No migration or persisted interface flag is needed to revert.
- Full automated suite freshly passed 537/537 tests in 74 files (32.88s). Typecheck and frontend/PWA/server builds passed; existing bundle-size warning remains. `git diff --check` passed.

Ignored local evidence: `.local-dev/13jr-*.log`, `.local-dev/ux-13jr/reconciliation.json`, `verified.json`, `rollback.json`, `browser-widths.json`. These contain synthetic development evidence and are not committed. Original 13J acceptance remains historical.

## Remaining acceptance and stop

Manual 320px contrast review, physical phones/tablets, staff workflow and actual screen-reader/assistive-device acceptance remain pending. Normal watcher/HMR internal diagnosis remains an environment limitation with the verified recovery above. No company data, project writes, database migrations, deployment or main merge. Stop after 13J-R for review; do not begin 13K or write integration.
