# Milestone 5 — Project requirement planning

## Workflow

Sign in with a current permitted writer role. In Product Library, save a complete draft with inventory-linked materials and approve its saved revision. Approval creates a separate immutable published version; editing the draft never changes that version.

Open Projects, create a project and add schools/sites with contact, location, schedule and fulfillment details. Select approved versions independently per school. Enter subject/grade quantities and explicitly confirm complete-set counts (including zero for partial sets). Optional commercial references do not require a quotation or order. Save before calculating requirements. Reasoned project defaults and school overrides remain separate from the master template; school overrides take precedence.

Prastuti example: School A requests two complete Science Grades 8–10 sets; School B requests three Grade 8 Science sets and zero complete sets. Common crate counts are A: 2/2/2 and B: 3/0/0. Universal crate counts are 2 and 0. Mathematics quantities remain independent and have no common crate unless explicitly configured. Unequal grade quantities never imply complete sets.

Packing assignments provide placement trace only. Repeated pouch references add no demand. Reusable flags do not automatically reduce quantities; project/site scoped crate rules require explicit allocation, and duplicate positive allocations for the same scoped definition are rejected.

## Data and stock boundaries

Project/site/version/material lines retain calculation basis, overrides and explicit unit conversion provenance. Six-place arithmetic rejects overflow and conversions requiring unrepresentable precision. Only active tenant-owned, direct unit conversions apply; missing/incompatible units are flagged and kept separate.

Gross demand is calculated. Verified stock, reservations, available-to-promise, incoming supply and shortages remain null/unverified. Operational release is blocked. No inventory, reservation, purchasing or production records are created. Historical quantities are not trusted physical stock.

## Migration and rollback

`1791417600002-AddProjectPlanning` adds projects, ordered school sites, approved-version links, immutable project revisions and approval provenance. Composite tenant foreign keys and published-version immutability triggers protect ownership and snapshots. Writes use transactions and revision conflicts.

The guarded `scripts/migrate-project-planning-dev.ts` applies only this migration to the dedicated loopback development database; it never resets, synchronizes or seeds it. Applied successfully once on 2026-10-13. No production migration was performed.

Empty-schema down/up was verified in synthetic PostgreSQL schemas. Down refuses rollback when any project or approval exists. For populated databases retain the schema/data and disable planning access or use a reviewed forward fix. Older code must not save newer master content. Never delete snapshots to permit rollback.

## Verification — 2026-10-13

- Focused checks: 50 tests pass (quantity rules, approval/planning PostgreSQL HTTP integration and existing Kit Builder integration).
- Full suite: 367 tests across 52 files pass; typecheck and frontend/PWA/server builds pass. Existing bundle-size warning remains.
- Dedicated development ERP: real login, approval, two-school save/reopen/recalculate, revision history, stale edit rejection and unchanged inventory/stock ledger pass. Synthetic fixture demand is 3.3 m. Early attempts reached an older server; restart resolved missing routes without code changes.
- Integration covers application/database restart persistence, immutable masters/snapshots, tenant isolation, concurrent writes, explicit conversions, scoped allocations, rollback guards and inventory non-mutation.
- Browser/visual acceptance is UNVERIFIED: no immediately callable runtime. Pending: Projects form navigation, school editing, approval selection, override controls, requirement tables and reload interaction.

Stop for review. No merge, deployment, operational release or subsequent milestone.
