# ERP state — 2026-10-14

Branch: feature/kit-builder-milestone-1. Milestones 1–8 implemented. M8 implementation: 49c92487b163e15f928b98558b1ec1e00557ce93.

Independent immutable approved recipe versions and work order snapshots support explicit yield, units, scrap and chemical metadata. Manual/project-site production carries assignment, priority, due date and demand revision. Verified input reservations share capacity with project reservations. Actual issues consume stock; pending/rejected/rework output is unavailable; QC acceptance alone adds stock. Existing stock_ledger remains the physical source; legacy inventory masters/history remain unchanged.

Current-user RBAC, tenant isolation, exact decimal conversions, item locks, optimistic revisions, immutable events, actor-bound idempotency and deferred reconciliation protect operations. Read-only project previews include production allocations/incoming; no automatic fulfillment, dispatch or procurement expansion. Production history protects sites and active work blocks project archival.

Migrations 1791763200005/0006 applied only to isolated development; empty rollback/reapply and populated rollback refusal PASS. See ADR-027 and runbook 32.

Verification: 11 focused production tests; final full 418 tests/56 files PASS; typecheck and frontend/PWA/server builds PASS. Authenticated development HTTP scenarios cover laser partial QC, make-for-stock multi-batch and multi-school linked production: input 20→11 m, accepted output 6 m, rejected output 2 m. Repeated previews preserve stock and existing masters/history.

Browser acceptance PENDING (runtime EPERM). Stop for review; no Milestone 9, merge or deployment. Use /new or /compact before further work.
