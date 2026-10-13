# ERP state — 2026-10-13

Branch: feature/kit-builder-milestone-1. Milestones 1–4 implemented; Milestone 4 starts from cf5f6abf83131b99021a72ac15af7b6dfdad288e.

Ordered common/universal/custom crates and generic quantity rules extend version-owned subjects JSONB. No new migration or backfill. Explicit complete-set counts, independent subject/grade counts, optional selections and reasoned overrides produce traceable previews. Tenant/RBAC, draft-only edits, revision conflicts and immutable snapshots retained; see ADR-023.

337 tests across 50 files PASS; focused crate/PostgreSQL acceptance: 58 PASS. Typecheck and frontend/PWA/server build PASS. HTTP/database restart persistence, tenant isolation, concurrency, earlier snapshots, published restrictions and unchanged inventory/stock-ledger rows verified. Browser interaction remains UNVERIFIED: no callable runtime available.

Existing accounts/company data preserved. No reset, seed, historical import or stock transactions. Existing bundle warning remains; earlier dependency advisories were not re-audited.

Next: review and browser acceptance in an enabled runtime. No Project Integration, merge or deployment authorized.
