# Milestone 13M-D1 foundation — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Baseline local/remote: 52dd7c48847d6d747ef885129ed384da78c6babc.
Implementation: 34bcf3dc8eb1c628ab9ce731a0613a62adb2f756, pushed and remote verified.
This separate continuity commit follows.

Read docs/erp/ui-ux/MILESTONE_13M_D1_ACCEPTANCE.md and linked foundation/shadow reports.
Added seven tenant-safe ledger tables, immutable entitlement/event/source evidence, transactional
A/F/H conservation, synthetic exclusive claims, transfer/consume/release/split, revised total caps,
exact planning/stock quantities, independent replay and read-only diagnostic comparison.
No operational writer, route, UI or historical activation was added.

Verified: focused PostgreSQL 30/30; full suite 76 files/576 tests; typecheck;
frontend/PWA/server builds; migration empty-prerequisite and populated-synthetic up/down/up;
populated-ledger downgrade refusal; concurrency/retries/SQL tampering/injected rollback.
All 22 operational-table before/after counts and hashes match. Shadow found 10 records
without lineage; findings grant no execution rights. Build reports bundle-size warning.

Changed: src/db.ts, ledger entity/migration/services, integration helper/harness,
docs/erp/INDEX.md and three D1 reports; continuity files updated separately.
No new dependencies. Ignored test cluster/logs remain local; company data untouched.
Unrelated unstaged AGENTS.md remains preserved.

Next: independent review before any reservation/procurement/production/packing/delivery integration.
Review real-source exclusivity, settlement proof, revision compatibility, shadow adapters,
multi-account locks and DB privilege boundaries. No deployment or main merge.
Use /new or /compact for the review phase.
