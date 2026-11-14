# Milestone 13E acceptance — 2026-10-16

**PASS automated bounded development acceptance; manual acceptance pending.**
Starting SHA: 31395d4f60f0c913755e928586f44f5957708579.
Branch: feature/kit-builder-milestone-1. Isolated PostgreSQL on 127.0.0.1:55432
with synthetic development/test records only. No company data or deployment.

| Check | Result |
| --- | --- |
| Focused Studio/API tests | 41 passed |
| Full automated suite | 513 passed, 70 files, no skips/failures |
| Typecheck | PASS |
| Frontend, PWA and server builds | PASS; existing bundle-size warning |
| Draft persistence | HTTP/DB restart test, explicit browser save/reload/reopen, same values in legacy editor |
| Concurrent saves | Transactional API race gives 200/409; two browser tabs reject stale write and retain local values |
| Authorization | Unauthenticated, reader role, foreign tenant and disabled flag rejected server-side |
| Approved immutability | Approved snapshot edit rejected; persisted snapshot unchanged |
| Business regression | Existing Science/common/universal, Mathematics, shared material, precision/conversion and allocation tests pass |
| Navigation | Dirty close and legacy return cancellation retain edits; saved navigation succeeds |
| Revision comparison | Earlier saved snapshot comparison and keyboard disclosures verified |
| Desktop/tablet/reflow | Edge 1440×1000, 768×1024, 390×844; no Studio horizontal overflow or page errors |
| Accessibility | Three scoped axe WCAG A/AA/2.1 AA + best-practice audits: zero violations/incomplete checks; helper contrast corrected |
| Flag-off rollback | Entry hidden, direct Studio unavailable, saved draft available in legacy editor |
| Inventory | Before/after inventory_items, stock_ledger, project_stock_reservations fingerprints identical; seven verified physical locations reconcile |

Evidence (ignored/private): .local-dev/ux-13e/browser-report.json,
rollback-report.json, ledger-report.json, desktop-editing.png,
tablet-editing.png, reflow-editing.png and stale-conflict.png. Logs are
.local-dev/milestone13e-*.log. No credentials or evidence committed.
Reproduce browser checks with scripts/validate-studio-editing.mjs and --rollback,
using the isolated environment, existing synthetic fixture and private pilot
accounts; axe tooling is the existing ignored 13C local installation.

The initial operational fingerprint check included mutable draft versions and
correctly differed after saves. Final reconciliation compares operational tables
only; immutable approved content is independently asserted by integration tests.
In-app browser controls stalled; independent automated Edge acceptance completed.
Screenshots and axe do not replace manual screen-reader/tablet/staff acceptance.
Review the integration limits before authorizing another slice.
