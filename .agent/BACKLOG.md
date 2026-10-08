# ERP Ordered Backlog

Status legend: TODO / IN_PROGRESS / BLOCKED / DONE. Mark DONE only with linked evidence/test results.

| ID | Priority | Status | Work | Acceptance |
|---|---|---|---|---|
| P0-01 | P0 | PARTIAL | Actual repo audit VERIFIED from uploaded snapshot (no Git SHA or DB); full build baseline pending dependencies | Source tree available; code audit complete; `npm ci`/app tests pending |
| P0-02 | P0 | TODO | Real template and packaging data mapping | Approved G8/G9/G10 BOM, class/universal crate rules |
| P1-01 | P0 | TODO | Port starter quantity engine to repo TS | Tests for scoped multipliers and traceability |
| P1-02 | P0 | TODO | Versioned templates and project requirements schema | Non-destructive migration + immutability tests |
| P1-03 | P0 | TODO | Project/template/overrides APIs | Auth validation, version audit, idempotency |
| P1-04 | P0 | TODO | Demand calculation and availability adapter | Physical stock unchanged; correct availability |
| P1-05 | P0 | TODO | Project quantity planning UI | End-to-end G8/9/10 wizard and explanations |
| P2-01 | P0 | TODO | Reconcile stock balances/ledger | No parallel write owners, migration dry-run |
| P2-02 | P0 | TODO | Atomic reservations | Race tests and release/retry behavior |
| P3-01 | P1 | TODO | Purchase requests & receipts | Project/general stock demand traceability |
| P3-02 | P1 | TODO | Production and preparation output into stock | MDF/chemical/assembly use cases |
| P3-03 | P1 | TODO | QC/quarantine/rework | Never reserve failed material |
| P4-01 | P1 | TODO | Physical packing hierarchy + labels | Correct box/pouch/grade common/universal labels |
| P4-02 | P1 | TODO | Delivery batches and site setup | Partial shipment + installation acceptance |
| P4-03 | P1 | TODO | Structured survey and team tasks | Versioned surveys, flexible user responsibilities |
| P5-01 | P2 | TODO | Quotes/sales/storefront unification | One order and stock fulfillment source |
| P5-02 | P2 | TODO | Operational costing and management reports | Explicit costing provenance, no full GL prerequisite |
| P6-01 | P2 | TODO | Security, backup, rollback, import and performance hardening | CI, recovery drill, release checklist |
| P7-01 | P3 | TODO | Selective legacy removal & advanced opt-ins | No regression, user-approved removal |

## New multi-school/data preservation blockers added 2026-10-08

| ID | Priority | Status | Work | Acceptance |
|---|---|---|---|---|
| P0-03 | P0 | TODO | Real inventory master preservation + quantity validation | Read-only export, counts, ID crosswalk, tested recovery |
| P0-04 | P0 | TODO | ProjectSite and physical crate counting sign-off | Multi-site trace and explicit crate counts |
| P0-05 | P0 | TODO | Local deployment baseline / backup plan | Docker/LAN/backup/restore documented |
| P1-06 | P0 | TODO | Multi-school quantity calculation tests | Project aggregate, school-specific manifest and no double counting |

## V5 dynamic product authoring milestones — higher priority than old spreadsheet-first template tasks

| ID | Priority | Status | Work | Acceptance |
|---|---|---|---|---|
| B0-01 | P0 | TODO | Build baseline, secure APIs, migrate safely | Actual command output, secure routes, no destructive seed |
| B1-01 | P0 | TODO | Generic Product Library + create/edit Draft via UI backed by Postgres | Empty DB, add kit and reload persistently |
| B2-01 | P0 | TODO | Editable educational activity structure, variant dimensions, component picker | New kit not hardcoded to Prastuti |
| B2-02 | P0 | TODO | Editable packing hierarchy box/partition/pouch/crate and associations | Several activities may share one pouch; no double count |
| B3-01 | P0 | TODO | Safe typed rule editor/evaluator + multi-site read-only preview | Exact V4 crate cases; no stock mutation |
| B4-01 | P0 | TODO | Validate, review, publish and clone immutable kit versions | Old projects pinned; per-site overrides isolated |
| B5-01 | P1 | TODO | Import historical Excel to **draft staging** with human review | No fabricated unit costs or quantities |
| B5-02 | P1 | TODO | Integrate stocktake, procurement, make/prepare, QC, labels, delivery | Traceability and ledger transaction checks |

Existing `P0-02` approved Prastuti BOM requirement remains a **production rollout gate**, NOT a blocker for Builder MVP.
