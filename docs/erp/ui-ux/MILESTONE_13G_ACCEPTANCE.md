# Milestone 13G acceptance — 2026-10-16

PASS for the bounded authenticated read-only foundation. Physical acceptance and
future write integration are not approved by this result. Starting revision:
`0b6c156b88f91a9a8c87eb2730bd865ed33de735` on
`feature/kit-builder-milestone-1`.

## Implemented boundary

Precision Operations displays authorized project/school snapshot context, packing
revision/status, package outline/ancestry, required contents, recorded assembly/QC,
exceptions/provenance, operator/reviewer UUIDs, activity links, order quantities
and latest history. Existing PackingService calculations and active-user tenant
authorization are reused. Missing contracts have explicit unavailable states.
No completion, approval, scan evidence or stock balance is invented. No synthetic
QC transition demonstration or mutation control is included.

Separate development/test-only `PACKING_WORKSPACE_READ_ONLY` and exact
`PACKING_WORKSPACE_ORGANIZATIONS` gate default off. Operational PackingPanel is
still the default even when eligible; opening the workspace is explicit. No
migration. See [field audit and rollback](MILESTONE_13G_CONTRACT_AUDIT.md) and the
separate [future-write proposal](MILESTONE_13G_WRITE_PROPOSAL.md).

## Automated verification

Isolated PostgreSQL: loopback port 55432, database ending `_development`, existing
authorized synthetic Kit Builder Development organization. Browser acceptance
uses existing synthetic records (four orders); selected order has 29 packages.
No company or production records were used.

| Check | Result |
|---|---|
| Focused PostgreSQL integration + contract unit tests | 21/21, two files |
| Full automated suite | 527/527, 72 files, 32.68s |
| TypeScript | PASS, no diagnostics |
| Frontend + PWA + server build | PASS; existing large-chunk warning remains |
| Authenticated HTTP/PG | Bearer required, tenant isolation, current DB viewer role despite elevated JWT claim, revoked role denied, unknown/malformed identity, write rejection |
| Data fidelity | Legacy and workspace list/detail deep-equal; label identities resolve same authorized package |
| QR/keyboard | PK code, UUID, same-origin ERP QR URL + Enter; unknown identity and foreign URL errors retain selection; package selection focuses heading, lookup restores scan focus |
| Failure/empty states | Simulated 403/409/503 clear stale detail and recover; empty queue and unavailable flag displayed |
| Rollback | Actual server flag disabled; workspace API 404, new workspace absent, legacy authenticated QR UI reads same package |
| Read-only reconciliation | All workspace browser requests GET; seven complete-table fingerprints unchanged in enabled and actual disabled runs |

The existing multi-page PDF/QR label test exceeded its default five-second limit
under full-suite load twice. The complete suite passed with two workers and a
30-second test timeout; no failing assertion was suppressed.

Reproduction (PowerShell, repository root; requires isolated development server
on 3101 and existing ignored synthetic pilot accounts/axe tooling):

```powershell
$env:TEMP=(Resolve-Path .local-dev).Path; $env:TMP=$env:TEMP
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --reporter=dot --maxWorkers=2 --testTimeout=30000
node --env-file=.env.kit-builder-development node_modules/typescript/bin/tsc --noEmit --pretty false
npm run build --silent
node --env-file=.env.kit-builder-development scripts/validate-packing-workspace.mjs
# Restart the same isolated server with PACKING_WORKSPACE_READ_ONLY=false:
$env:PACKING_ACCEPTANCE_ROLLBACK='true'
node --env-file=.env.kit-builder-development scripts/validate-packing-workspace.mjs
```

## Browser, accessibility and evidence

Standalone authenticated headless Microsoft Edge: desktop 1440×1000, tablet
768×1024 and narrow reflow 390×844. Workspace content widths/scroll widths match
(1118, 446, 364px); all visible controls minimum 48px high. Captured queue and
selected-package views were visually reviewed. Native keyboard navigation and
focus restoration pass. These viewport tests do not constitute physical tablet,
screen-reader, browser zoom or scanner validation.

Three scoped axe WCAG A/AA/2.1 AA and best-practice audits: zero violations.
Desktop has one incomplete contrast check on text clipped by the scrollable
outline; computed foreground/background contrast is 15.38:1. Tablet and narrow
audits have no incomplete checks. This is scoped automated evidence, not full
WCAG certification. Application shell is outside the workspace axe scope.
Three existing development WebSocket-close errors were separately recorded;
no other application runtime errors occurred.

Ignored local evidence under `.local-dev/ux-13g/`: `browser-report.json`,
`rollback-report.json`, `desktop.png`, `tablet.png`, `reflow.png`, matching
`*-package.png`, `unknown-package.png`, `rollback.png`. Reports include complete
before/after hashes, HTTP methods, layouts, audit details and runtime errors.
Test/build logs: `.local-dev/13g-full-suite.log`, `13g-typecheck.log`,
`13g-build.log`, `13g-browser.log`, `13g-rollback.log`. Credentials remain ignored.

| Operational table | Rows | Before = after MD5 |
|---|---:|---|
| inventory_items | 12 | 22c2ce24c00be7fefb375b1c598f7629 |
| stock_ledger | 20 | 503075566241331bfa340c247e5a6231 |
| project_stock_reservations | 5 | b20e3c152d875a2b1fba531fe5f6e600 |
| packing_orders (including QC execution JSON) | 4 | 33008a17ffd00adbfb49b109b3cf030a |
| packing_picks | 4 | 2395d20e7b1283fac1d1a5b7639aaf8a |
| supply_events | 160 | ea0628bb66340f371b45d422f334a155 |
| supply_operations | 156 | 6e3bdb8832446db1a9962d9685718a4c |

## Review gates

Physical tablet/operator, printer, physical scanner, screen-reader and actual zoom
acceptance remain pending, together with earlier Milestone 12 readiness gates.
Latest-record pagination, action capabilities, per-material package completion,
immutable inspection attempts, attachment linkage and device/duplicate-scan
contracts require decisions before writes. Review the separate proposal; do not
enable write integration, dispatch, inventory operations, merge or deploy under
13G. No environment flag was persisted; temporary acceptance server is stopped.
Unrelated AGENTS.md edits remain preserved and excluded from milestone commits.
