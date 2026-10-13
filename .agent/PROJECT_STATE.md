# ERP state — 2026-10-13

Branch: feature/kit-builder-milestone-1. Milestones 1–5 implemented; Milestone 5 starts from 0b0bd1175b8c8aaa340ce785fe46a8dedb5bf391.

Tenant-scoped multi-school planning selects explicitly approved immutable Kit Builder versions. Independent school quantities, reasoned project/site overrides and explicit scoped allocations produce traced requirements. Packing references add no demand. Six-place calculations use active explicit unit conversions. Stock/shortage fields remain unverified/null; operational release is blocked. See ADR-024 and docs/erp/29_PROJECT_REQUIREMENT_PLANNING_RUNBOOK.md.

Additive migration 1791417600002 applied only to the isolated development database. Empty rollback/reapply and populated rollback refusal verified in synthetic schemas. No reset, historical import, operational transactions, account or existing inventory changes.

367 tests across 52 files PASS; 50 focused checks PASS; typecheck and frontend/PWA/server builds PASS. Development ERP login/save/reopen/recalculation/history/conflicts and unchanged inventory/ledger PASS. Integration restart, tenant isolation, concurrency and immutable snapshots PASS. Browser acceptance remains UNVERIFIED; no callable runtime. Existing bundle warning remains.

Stop for review and browser acceptance. No merge, deployment or subsequent milestone authorized.
