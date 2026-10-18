# Milestone 13M-A backend checkpoint — 2026-10-18

Branch: feature/kit-builder-milestone-1. Implementation commit: 5354085.
This continuity checkpoint follows; resolve final HEAD with git and verify origin.

Authoritative immutable project revision approval now covers all saved schools.
Active tenant admin/super_admin may approve, including their own edits (explicit
user decision). Exact snapshots, canonical SHA-256, actor/time, durable retries,
concurrency serialization and downstream immutable bindings are implemented.
Approval has no operational stock effects. Historical evidence is not backfilled.

Read docs/erp/ui-ux/MILESTONE_13M_A_BACKEND_CONTRACT.md and
MILESTONE_13M_A_ACCEPTANCE.md; committed fingerprints reconcile 22 operational
tables with zero approval-time changes. Current approved execution is guarded
across reservations, procurement, production, packing, delivery, installation and
closure, including child and ledger writes. Historical/superseded execution is
blocked pending separately authorized reconciliation. Exception reasons do not
bypass approval. Populated migration rollback refuses evidence deletion; use
reviewed forward recovery.

Verification: 11 focused PostgreSQL tests; all 76 files / 557 tests; typecheck;
frontend/PWA/server builds pass. Existing large-chunk warning remains. Tests use
isolated synthetic PostgreSQL and external temporary storage; no company data.

Stop after 13M-A for separate backend enforcement review. No approval UI,
deployment or main merge. Preserve unrelated unstaged AGENTS.md. Next work:
review cross-cutting trigger coverage and approve historical reconciliation policy
before operational adoption or UI integration. Start with /new or /compact.
