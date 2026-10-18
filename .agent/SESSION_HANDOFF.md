# Milestone 13M-D2A-R — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Review checkpoint 86c54de30a564f13daec5344f68c428c0cc6d8fd pushed; live
GitHub HEAD matched. This separate continuity commit follows.

Verdict: CONDITIONAL PASS for the isolated reservation boundary. No reproducible
production defect; no production/schema changes. Added adversarial PostgreSQL
checks for concurrent increases, duplicate release, stale approval lock contention,
audit-failure rollback, unsupported ledger consumption/release, source reuse,
precision limits and restricted-runtime source/event/projection/receipt writes.

Read docs/erp/ui-ux/MILESTONE_13M_D2A_R_INDEPENDENT_REVIEW.md and
MILESTONE_13M_D2A_R_FINGERPRINTS.json. Changed reservationCommitment.cases.ts,
review/evidence and docs index.

Fresh verification: focused PostgreSQL 37/37; complete two-worker suite 583/583
in 76 files; typecheck and frontend/PWA/server builds PASS. No fresh timeout.
Initial sandbox permission/local-network failures resolved through reviewed
elevated test execution; assertions/timeouts unchanged.
Fresh nonempty restore/replay PASS: 24 accounts, 69 events, 12 equal table
fingerprints, 11 pinned functions and restored witnesses. Reservation tests left
physical inventory/ledger and unrelated operational fingerprints unchanged.

Stop after D2A-R. D2B may begin only with separate user authorization and exclusive
PR/PO lineage; fulfillment/packing/downstream consumption remain blocked.
Production adapter/pool, historical reconciliation, staging roles/ACLs/TLS/secrets/
startup smoke, identity SELECT exposure and historical packing-label reliability
remain open. No deployment, main merge, operational cutover or real inventory changes.
Unrelated AGENTS.md remains uncommitted. Use /new or /compact.
