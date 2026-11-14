# Engineering Execution Roadmap & Delivery Gates

## Non-destructive strategy

Prefer an **incremental strangler migration inside the existing repository**. Do not delete old tables/code, or modify production data, before replacement and backfill validation. No parallel full rebuild unless new verified evidence justifies it.

## Gates (do not skip)

### P0 — Source verification and baseline

- [ ] Clone/open repo and record commit SHA/branch/license/dependencies.
- [ ] Run existing `install`, lint/typecheck, tests and build if possible; store exact output.
- [ ] Inventory entities/routes/migrations, identify true stock owner and localStorage usages.
- [ ] List all deployment secrets/systems **without copying secret values into handover**.
- [ ] Identify sample real Prastuti master BOM and get business confirmation of common/universal crate quantity semantics.
- [ ] Record current app UX with approved screenshots if needed (avoid exposing customer data).
- [ ] Log findings and accepted design adjustments in `.agent/`.

**Exit:** baseline report with reproducible commands and no unexplained data owners.

### P1 — Reference engine validated (already started in package)

- [x] Dependency-free reference quantity engine and synthetic fixture/tests included in `starter/`.
- [ ] Port/align engine to repository TypeScript style + existing test framework.
- [ ] Add real verified anonymized fixture derived from approved Prastuti template data.
- [ ] Add cycle/size protection for nested templates, validated UOM normalization, exact decimals if used.

**Exit:** correct deterministic expansion including grade common vs universal crate; no stock mutation.

### P2 — PostgreSQL project/template vertical slice

- [ ] Add versioned template and project snapshot entities in non-destructive migration.
- [ ] Add project requirements/overrides; transactional server API.
- [ ] Demand calculation stored as immutable/versioned result or regenerable audited snapshot.
- [ ] Read stock balances via *currently authoritative* ledger/reconciliation adapter.
- [ ] UI wizard: project → template → counts → overrides → demand/availability.
- [ ] Automated tests: inputs, UOM, template immutability, permissions, idempotency, no stock mutation.

**Exit:** one user can build real multi-grade Prastuti project and explain each demand quantity.

### P3 — Reservation and stock correctness

- [ ] Repair/consolidate stock truth after historical reconciliation.
- [ ] Atomically reserve against available stock using DB row locks/conditional updates.
- [ ] Distinguish quarantine, incoming, staging, packed and dispatched.
- [ ] Concurrent reservation and ledger invariants tests.

**Exit:** no oversell/double decrement possible in designed operations.

### P4 — Purchasing, production and QC

- [ ] PR review + buyer approval and general replenishment.
- [ ] PO receipts and incoming QC/quarantine.
- [ ] Make-to-stock/make-to-project production, raw input consumption, output receipt.
- [ ] Quality release and exception/rework.

**Exit:** prepared MDF chart and stock-ready kit are correctly traceable.

### P5 — Packaging, delivery, site

- [ ] Template packing definitions + physical box/crate/pouch instances.
- [ ] Label printing and mobile scanning; completeness verification.
- [ ] Multiple delivery batches, setup tasks, handover proof.
- [ ] Survey versions, task dependency graph and operational dashboard.

**Exit:** an actual school project goes from discovery through installation and accepted handover.

### P6 — Commerce & reporting

- [ ] Quotes/approval linked to projects, direct sales order channel, online storefront same item/stock truth.
- [ ] Operational costing, project margin estimates and GST-ready fields.
- [ ] Production/warranty/project reports and exports.

**Exit:** storefront and institutional orders cannot conflict with stock commitments.

### P7 — Hardening & cutover

- [ ] Access and security review, 25-user load and mobile workflow checks.
- [ ] Data migration dry-run + reconcile + rollback rehearsal.
- [ ] Restore from backup, logging, error visibility, release checklist.
- [ ] Retire confirmed obsolete code only after cutover and usage verification.

## First vertical slice—exact acceptance

Input: G8 kits 30, G9 kits 20, G10 kits 25; each grade common crate 1; universal crate 1. Synthetic line math must match test fixture; real master fixture must be sourced from company records and confirmed. Demand read only; on-hand, reserved-elsewhere and inbound shown separately; template remains unchanged after School A override.

## Tickets

Canonical live backlog is `.agent/BACKLOG.md`; modify statuses there, **not** by silently editing this baseline roadmap.

## Deliverable policy

Every finished ticket needs: code, tests, migration notes, docs, status update, user-visible verification of workflows, and a clear handoff. No “implemented” status for mere stubs or screens that have no backend effect.
