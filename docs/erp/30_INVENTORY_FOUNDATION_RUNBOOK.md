# Milestone 6 — Physical inventory foundation

The existing PostgreSQL `stock_ledger` supplies verified physical balances. Historical ledger rows and inventory quantities, prices and locations remain unverified and unchanged. `physical_stock_scopes` stores approved unit/location metadata, never a second quantity balance. Only ledger rows linked to approved physical count entries contribute to verified stock.

## Count, review, approve and post

1. Sign in and open Inventory → Physical stocktake. Create a named session, select existing inventory items and explicitly declare physical location labels. Confirm complete coverage only when all physical locations are represented; legacy location values are not automatically trusted.
2. Save a quantity and explicit unit for each item/location. Saving an existing entry replaces that draft count explicitly, without creating a duplicate. Draft targets can be edited after removing affected counts. Count revisions retain actor/time provenance.
3. An inventory reviewer records the reconciliation reason. Missing counts require explicit partial review. Unknown baselines display Unverified. Unit conversion requires one active tenant-owned explicit conversion, preferring item-specific mappings.
4. An authorized approver approves reviewed counts and posts them. Counters: staff/inventory_staff/manager/admin/super_admin. Reviewers: inventory_staff/manager/admin/super_admin. Approvers: manager/admin/super_admin. Current database roles are checked on every request; JWT role claims cannot grant approval.
5. Reload the session and inspect immutable history and verified ledger. Posting retries return the original result. Posted counts cannot be edited; corrections use a new reviewed/approved stocktake.

Initial count entries create `INITIAL_BALANCE`; subsequent counts create `CYCLE_COUNT_VARIANCE` equal to count minus the last verified location balance. Counts, provenance and ledger entries commit together. Parent revisions prevent lost edits; sorted item locks serialize posting; reviewed sequence/balance mismatches reject stale counts for fresh review. Unique count IDs and location sequences enforce exact-once posting.

The existing ledger supports receipt, issue, return and transfer transaction types; this milestone exposes only approved opening balances and count adjustments. Future movement workflows must retain the same tenant, authorization, unit, ledger and idempotency protections. Legacy manual movement/location services are blocked for verified items. Procurement, production, reservations and incoming supply are not enabled against verified stock.

## Quantities, coverage and planning

Physical quantities use the ledger's existing four-place decimal precision and at most eight integer digits. Parsing and conversion use integer arithmetic; negative, exponent, excessive-precision, inexact conversion and overflow inputs are rejected. Legacy prices are not used as approved valuation; physical entries carry zero unit_cost as an unvalued placeholder.

Location/unit scope becomes immutable when first posted. Subsequent stocktakes retain that declared scope. A later approved posting can explicitly confirm complete coverage, or withdraw that attestation, without changing the original scope or earlier snapshots. Changing the location/unit scope requires a reviewed forward migration; never silently substitute a different scope.

Global on-hand remains Unverified until complete coverage is explicitly approved and every declared location has a verified ledger balance in the requested unit. An uncounted location is not zero. A physically counted zero is a verified zero. Partial counts remain visible in the ledger but cannot imply a complete item balance.

Project requirement preview separates gross demand, verified on-hand, available unreserved stock and immediate shortage. Reservations, incoming and projected shortage remain null/Not configured. Availability is an unreserved planning comparison, not an operational promise; operational release stays blocked. Incompatible units or incomplete stock coverage show Unverified, with null shortage. Preview never posts ledger entries or changes stock, saved template versions or project snapshots.

Example: synthetic two-school gross demand 3.3 m; approved counts 1.5 m + 0.5 m give verified stock/available 2 m and immediate shortage 1.3 m. Before verification, stock and shortage were null. Repeated preview does not alter those balances.

## Development migration and verification

Migration `1791504000003-AddPhysicalStocktake` adds three stocktake/provenance tables, five nullable ledger columns, foreign keys, exact-once indexes and immutable/protective triggers. Existing ledger precision and legacy records are preserved. Apply only to the dedicated development database:

```powershell
node --env-file=.env.kit-builder-development node_modules/tsx/dist/cli.mjs scripts/migrate-physical-stock-dev.ts
```

The script refuses every host/port/database except 127.0.0.1:55432/experimind_kitbuilder_development and never resets, seeds or synchronizes existing data. Migration down/up passes on empty isolated schemas. Down deliberately refuses populated stocktake history: preserve posted balances and use a forward fix. Do not deploy an older application against verified items or bypass protective triggers.

Verified 2026-10-14: focused 41 tests; full 397 tests/54 files; typecheck and frontend/PWA/server builds PASS. Coverage includes lifecycle, permissions, duplicate posting, openings/adjustments, partial/zero stock, explicit coverage, conversions, tenant isolation, concurrency, immutable records, reconciliation, restart, rollback refusal and planning non-mutation. Real ERP login/count/review/approve/post/retry/reopen/project preview PASS; legacy inventory and ledger unchanged. Synthetic acceptance evidence and credentials remain ignored under `.local-dev/`.

Browser acceptance PENDING: the immediately available bootstrap returned EPERM; no repeated troubleshooting. In an enabled runtime, complete steps above, inspect missing-count/discrepancy messages and role controls, and open the existing multi-school project's requirements before/after stock verification. Existing bundle-size warning remains. Stop for review; no merge, deployment or next milestone.
