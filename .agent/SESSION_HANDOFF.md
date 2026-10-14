# Session handoff — Milestone 8

Branch: feature/kit-builder-milestone-1. Implementation 49c92487b163e15f928b98558b1ec1e00557ce93 pushed; local/remote matched. Starts from e94d37bcbd47310f0f81bd5e137ee9070ef53294.

Implemented independent versioned recipes, explicit yields/units/scrap and chemical metadata; immutable approved versions and order snapshots. Manual/project-site orders support release, verified input reservations, assignment, actual issues, partial batches, QC accept/reject/rework/resubmit and finalization. Current-user RBAC, tenant ownership, revisions, item locks, immutable audits, actor-bound idempotency and deferred reconciliation protect operations. Only actual issues and accepted QC move the existing ledger. No automatic fulfillment/dispatch or legacy master mutation.

Production allocations and incoming integrate with read-only requirement previews. Production history protects sites; active work prevents project archival. Changes span entities/migrations/services/routes, production and project panels, tests and runbook 32/ADR-027.

Migrations 1791763200005/0006 applied only to isolated development. Empty rollback/reapply PASS; populated rollback refuses history loss.

Verification: 11 focused production tests; final full 418 tests/56 files PASS; typecheck and frontend/PWA/server builds PASS. Authenticated development HTTP PASS: laser partial QC accepts 3 m/rejects 2 m, make-for-stock accepts two 1 m batches, multi-school linked order accepts 1 m. Input balance 20→11 m; output 6 m. Exact replay posts once; 3.3 m project demand previews preserve ledger/legacy inventory and do not allocate automatically.

Browser PENDING: runtime EPERM; no retries. ERP loopback 3100/PostgreSQL 55432. Synthetic records/results/credentials ignored under .local-dev. Stop for review; no Milestone 9, merge or deployment. Use /new or /compact.
