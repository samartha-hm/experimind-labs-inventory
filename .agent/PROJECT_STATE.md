# ERP state — 2026-10-13

Checkout: D:/Experimindlabs/ERP/erp-development. Branch: feature/kit-builder-milestone-1. Milestones 1–3 implemented; M3 feature commit 69826d3bd1480e218a1074cb61f90f40e09e8f6f pushed and remote verified.

Physical packing extends existing version-owned subjects JSONB; no new migration or backfill. Stable ordered box/partition/pouch trees, shared activity assignments, independent inventory locations and read-only revision history delivered. Transactional tenant/RBAC, draft-only writes and optimistic revision checks retained. Inventory validation uses tenant-scoped transaction locks. See ADR-022 for embedded-reference and older-application rollback limitations.

298 tests across 49 files PASS, including real PostgreSQL and existing migration up/down smoke in isolated test schemas. Typecheck, frontend/PWA/server build and code review PASS. M2/M3 HTTP persistence verified across server/connection restart; browser save/reload/reopen acceptance remains UNVERIFIED because browser tooling is unavailable.

Existing development/test databases, accounts, company data and stock preserved. No seed/reset or production changes. Legacy APIs remain fail-closed. Existing large-bundle warning remains; dependency advisories from earlier setup are unresolved and not re-audited.

Next: browser acceptance using runbook 28 in a fresh chat. No crate/calculation milestone, merge, deployment or force-push authorized. Latest handoff checkpoint must be pushed and remote verified.
