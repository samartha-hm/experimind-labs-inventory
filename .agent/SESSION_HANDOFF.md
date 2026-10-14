# Session handoff — Milestone 6

Branch: feature/kit-builder-milestone-1. Implementation checkpoint: cada29a15c42523774321c13d5c0b758b0257619, pushed and remote HEAD matched. Starts from 2de85da9bd42df744c8c44388d73ca906e888767.

Implemented authenticated tenant stocktakes: draft counts, review, role-authorized approval and exact-once transactional posting to the EXISTING PostgreSQL stock_ledger. Immutable entry provenance/revisions, sorted item locks and reviewed balance/sequence checks protect concurrent counts. Explicit units use exact four-place ledger arithmetic. Historical inventory/master/ledger values remain unverified and unchanged; protective triggers block legacy writes to verified stock. No second quantity source.

Project previews show gross demand, verified on-hand, unreserved availability and immediate shortage. Missing coverage/unit compatibility shows Unverified, never zero. Reservations, incoming and projected shortage remain null/Not configured; operational release stays blocked. Partial count coverage requires explicit review; complete coverage requires approval.

Migration 1791504000003 adds three provenance tables and five nullable ledger columns/guards; applied only to isolated development DB. Empty rollback/reapply PASS; populated rollback refuses history loss. No reset or company-data access.

Verification: focused 41 tests and full 397 tests/54 files PASS; typecheck and frontend/PWA/server builds PASS. Actual ERP login/count/review/approve/post/retry/reopen/preview PASS: gross 3.3 m, verified 2 m, shortage 1.3 m. Recalculation, legacy inventory and historical ledger unchanged. Synthetic records retained; credentials/results/logs ignored.

Browser acceptance PENDING: bootstrap EPERM; no repeated troubleshooting. Existing bundle warning remains. Development ERP runs loopback 3100; PostgreSQL 55432.

Read docs/erp/30_INVENTORY_FOUNDATION_RUNBOOK.md and ADR-025. Stop for review. No next milestone, merge or deployment.
