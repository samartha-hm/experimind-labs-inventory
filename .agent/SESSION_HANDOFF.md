# Session handoff — Milestone 7

Branch: feature/kit-builder-milestone-1. Implementation ad0346dc989578721a50911ad48fc74d93f003a3 pushed; local/remote matched. Starts from b827eab517e330c7edc6762ff47552272db7a2f1.

Implemented tenant/RBAC reservations (adjust/release/cancel/explicit fulfillment), manual/project-site shortage requests, review/approval, supplier-linked orders and partial receipts with accept/reject/quarantine. Exact decimal conversions, revision checks, item locks, immutable audits and actor-bound idempotency protect operations. Existing stock_ledger remains the only physical source. Legacy master/quantities/prices/locations/history unchanged; unknown stock remains Unverified. No automatic allocation or production.

Previews separate gross demand, verified on-hand, reservations, free stock, approved incoming and immediate/projected shortages; credit own project allocations/fulfillments. Reads never post stock. Changes span supply entities/services/routes/UI, project planning, migration and stocktake guards.

Migration 1791676800004 applied only to isolated development. Empty rollback/reapply PASS; populated rollback safely refuses.

Verification: 10 supply tests; full 407 tests/55 files PASS; typecheck and frontend/PWA/server builds PASS. Authenticated HTTP acceptance PASS: demand 3.3 m, verified 2 m, reserve 2 m unchanged physical, request/order 1.3 m, pending unavailable, accept 0.5 m exactly once, reject 0.3 m unchanged physical. Final stock 2.5 m, reserved 2 m, shortage 0.8 m, incoming 0.5 m. Repeated previews preserve ledger/legacy inventory.

Browser PENDING: runtime EPERM; no retries. ERP loopback 3100, PostgreSQL 55432; synthetic records retained and credentials/results/logs ignored. Read ADR-026 and runbook 31. Stop for review; no Production/Preparation, merge or deployment.
