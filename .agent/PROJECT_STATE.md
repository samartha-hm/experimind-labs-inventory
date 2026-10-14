# ERP state — 2026-10-14

Branch: feature/kit-builder-milestone-1. Milestones 1–7 implemented; M7 starts from verified b827eab517e330c7edc6762ff47552272db7a2f1.

Tenant reservations allocate verified stock without physical changes. Exact decimal arithmetic, item locks, revisions, immutable audits and idempotency protect adjustments/release/explicit fulfillment. Existing stock_ledger remains the sole physical source; legacy inventory/master values remain unchanged and unverified.

Manual or project/site-shortage requests support draft editing/review/approval, supplier-linked orders and partial receipts. Approved orders require review/approval. Pending/quarantined/rejected receipts are unavailable; acceptance posts exactly once. Explicitly approved non-QC lines post on receipt. No automatic allocation or production workflow.

Read-only previews show gross demand, on-hand, reservations, free stock, incoming and immediate/projected shortages. Own project allocations/fulfillments and incoming receive credit; unknown stock remains Unverified. Supply history protects project sites from deletion.

Migration 1791676800004 applied only to isolated development PostgreSQL. Empty rollback/reapply and populated rollback refusal PASS. See ADR-026 and docs/erp/31_RESERVATIONS_AND_PROCUREMENT_RUNBOOK.md.

Verification: 10 supply tests; full 407 tests/55 files PASS; typecheck and frontend/PWA/server builds PASS. Authenticated HTTP: 3.3 m demand, 2 m verified, reserve 2 m unchanged physical, request/order 1.3 m, accept 0.5 m once, reject 0.3 m unchanged physical. Final stock 2.5 m, reservations 2 m, immediate shortage 0.8 m, incoming 0.5 m. Repeated previews preserve ledger/legacy inventory.

Browser acceptance PENDING (runtime EPERM). Stop for review; no Production/Preparation, merge or deployment. Use /new or /compact before further work.
