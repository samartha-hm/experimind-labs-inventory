# Milestone 13L acceptance — 2026-10-17

**PASS: bounded saved-requirement review. BLOCKED: requirement approval.**
The audited backend has no project/school requirement approval contract.
No approval endpoint, schema, transition, confirmation or success was invented.
See [contract matrix](MILESTONE_13L_CONTRACT_MATRIX.md) for permissions,
immutability, downstream effects and supported/blocked actions.

## Delivered

Exact project UUID/saved revision and actor/time; selectable earlier baseline
with actor/time; identity-based school/selection comparison; per-school,
all-school/removal and project/default-override differences; explicit missing
history and approval-unavailable messages. Existing subject/grade quantities,
approved Kit provenance, current server demand/warnings and independent stage
evidence remain available. Unsaved editor values are excluded. History selection
preserves the school identity when available. Latest 50 snapshots and initial
50 changed fields per table are explicit limits with change-table expansion.

## Verification

| Check | Result / evidence |
| --- | --- |
| Baseline | Branch `feature/kit-builder-milestone-1`; local and remote `eea82c0cf12f7f33c061d5d0559c5120771e63c9`; unrelated `AGENTS.md` preserved. |
| Automated suite | **546 tests, 75 files PASS**, including isolated PostgreSQL integration tests. `.local-dev/13l-tests.log`. |
| Typecheck / builds | `npm run typecheck --silent` and `npm run build --silent` PASS; frontend, PWA and server built. Existing large-chunk advisory remains. Logs `.local-dev/13l-typecheck.log`, `13l-build.log`. |
| Comparison coverage | School reorder/identity isolation, zero versus unknown, unchanged input, Kit reference/complete set/override reasons, added schools, escaped content, missing actor/history; 150-grade fixture produces 153 differences bounded initially to 50. Four new unit tests. |
| Permissions / unsupported approval | New PostgreSQL test: unauthenticated 401, viewer 403, cross-tenant unsupported mutation 405, legacy path 404, flag-off 404. Concurrent current/stale/repeated and retry requests all 405. Every isolated-schema table fingerprint unchanged. No claimed successful requirement approval or approver role. |
| Existing integrity / semantics | Full integration suite retains stale-save conflicts, closed-project guard, audit actors, Kit approval exact revision and duplicate idempotence, immutable Kit/approval/planning snapshot triggers, tenant isolation, Science per-grade/common/explicit complete sets, independent Math and packaging no-double-count rules. |
| HTTP and persisted data | Synthetic loopback PostgreSQL `127.0.0.1:55432/experimind_kitbuilder_development`; six projects and all histories identical before/after review, server restart and flag-off rollback. Unsupported HTTP probes `[401,405,405,405,405]` before and after restart. |
| Business reconciliation | **83/83 business tables unchanged**, including stock, reservations, purchasing, production, packing, Kits, approvals, projects and immutable histories. No allowed business mutations and no new snapshot. Login/session tables (`users`, `refresh_tokens`, `auth_sessions`) excluded explicitly because authentication updates session timestamps. Reports `.local-dev/ux-13l/{baseline,verify,restart,rollback}.json`. |
| Authenticated browser | Existing synthetic admin; r4 versus r1 shows School A quantity 2→3 and note change, added long-name school and school-specific overrides in all-school comparison. Historical r1 correctly has no earlier baseline. Reopened tablet after server restart retained r4/history/actor/comparison. No business save made. |
| Error recovery | Loopback proxy injected GET 503: explicit load error, identified saved r1 evidence retained, no approval success; cleared fault and refreshed successfully. Existing ambiguous-save protection remains covered by 13K tests; no new mutation is introduced. |
| Responsive / accessibility | Expanded comparison inspected at desktop1280, tablet768 and phone360 CSS pixels. Scoped axe WCAG2A/AA, WCAG2.1AA and best-practice: **0 violations, 0 incomplete**, 31 passing rules at each width. Phone stacks/wraps field identities; tablet wraps table content. Audit control activated by keyboard at tablet after pointer automation failed to resolve its location. Audit JSON and phone/tablet screenshots in `.local-dev/ux-13l`. |
| Rollback | Full temporary server restarted with Projects flag false. Workspace access false; legacy API projects, approved Kit references and histories identical; all 83 business hashes identical. Browser fallback verified separately. Legacy remains default; no Kit Studio/Packing flag changes. |

Commands use the existing synthetic environment file and temporary folder;
credentials are neither tracked nor printed. Initial attempts hit Windows temp
rename/permission restrictions and stopped PostgreSQL; dedicated temp folder,
permitted local runtime and existing PostgreSQL recovery resolved these before
the final successful suite. `DISABLE_HMR=true` workaround retained; no repeated
watcher investigation. Evidence/logs/generated output stay ignored.

## Limits and remaining gates

Requirement approval success, two-tab successful approval races, lost-success
response retry, approved requirement history and approval-induced downstream
changes are **not applicable / blocked**, since that contract does not exist.
Denial probes prove absence of mutation, not approval workflow idempotence.
Planning snapshots and immutable approved Kits are distinct evidence.

Physical devices, staff acceptance, screen-reader traversal, native unload-dialog
verification, realistic high-volume browser performance and production performance
remain pending. Large comparison is automated fixture coverage, not a claim of
production-scale browser acceptance. No production/company inventory, migration,
deployment, main merge or subsequent milestone work occurred. Stop for user review.
