# Session handoff — Milestone 5

Branch: feature/kit-builder-milestone-1. Verified implementation checkpoint: 668f35b59664982b74b0e7d7547b4c1b958a25ae, pushed and remote HEAD matched. Starts from 0b0bd1175b8c8aaa340ce785fe46a8dedb5bf391.

Implemented PostgreSQL multi-school projects, approved immutable template copies, per-school quantities, reasoned project/site overrides, explicit shared allocations, exact unit conversion and traced consolidated requirements. Packing references do not add demand. Stock/shortage fields remain null/unverified; operational release is blocked.

Migration 1791417600002 adds five planning/approval tables and immutability safeguards; applied only to the isolated development database. Synthetic empty rollback/reapply passes; populated rollback deliberately refuses. No reset, historical import or operational mutations.

Verification: 50 focused tests and full 367 tests/52 files PASS; typecheck and frontend/PWA/server builds PASS. Actual development ERP login, approval, two-school save/reopen/recalculate, history and stale edit rejection PASS; inventory and stock ledger unchanged. Two complete Science sets plus three Grade 8-only sets yield universal crates 2/0 and synthetic gross 3.3 m. HTTP/PostgreSQL integration verifies restart, tenant isolation, concurrency, snapshots and unit conversions.

Browser/visual acceptance UNVERIFIED: no callable runtime. Existing bundle-size warning remains. Development ERP restarted on loopback port 3100 to serve current code. Synthetic acceptance records retained; credentials/logs/results remain ignored.

Relevant paths: src/features/projects/, ProjectPlanningService, planning-projects router, approval additions, migration, tests and docs/erp/29_PROJECT_REQUIREMENT_PLANNING_RUNBOOK.md.

Next: stop for review; browser acceptance in an enabled runtime. No subsequent milestone, merge or deployment.
