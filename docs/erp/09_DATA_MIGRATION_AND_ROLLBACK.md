# Data Migration, Auditability and Rollback

## Core constraint

No repository/database available for fresh inspection in packaging session. Concrete table names are provisional until P0 source audit. Do **not** run illustrative SQL from `14_ENTITY_DRAFT.sql` against live DB.

## Migration strategy

1. Inventory all write paths and which quantity fields are authoritative in the running system.
2. Snapshot database and file attachments; test restoring backup in isolated environment.
3. Create new additive entities, indexes, constraints; avoid dropping old columns/tables first.
4. Migrate small anonymized/sample records and compare project quantities, stock balances, and BOM expansions.
5. Backfill master templates and project requirements with source/version/reference IDs; keep provenance.
6. Build adapters/dual-read where needed; avoid long-term dual-write without reconciliation.
7. Run dry-run migration across full dataset with reports of unmatched SKU/UOM/duplicate ID/negative stock/invalid references.
8. Cut traffic to new read/write path under transaction/idempotency controls.
9. Compare counts/sums/ledger reconciliation and critical workflows; keep old data read-only until signed off.
10. Remove legacy only after retention approval, backup and rollback window.

## Data mapping planning worksheet

| Old source (verify) | New owner | Transformation | Verification |
|---|---|---|---|
| InventoryItem master fields | Item | normalize stock vs master attributes | SKU/units unique and cross-referenced |
| InventoryItem.quantity + StockLocation + StockLedger | Balance/Movement | reconcile; do not simply add | signed opening balance + movement replay |
| Kit / KitBom | KitTemplate/version/lines | preserve quantity basis and crate hierarchy | count per grade vs common/universal |
| Project static/localStorage | Project/Requirement | provenance and owner; import only if real | compare 5 real projects |
| Production datasets | BOM/Production | separate master recipe from orders | input-output consistency |
| CustomerOrder / SalesOrder | SalesOrder/channel | prevent duplicate order fulfillment | order count, stock issue reconciliation |
| Stickers | PackingUnit/Label | map actual physical hierarchy | scan a real package |

## Critical migration rules

- Never regenerate historical immutable stock movements from guessed values without marking them as opening adjustments and reconciling.
- Never map “ready” status to “delivered” without physical evidence.
- All purchase/sales/customer documents keep stable external IDs and date histories.
- Do not fabricate missing lots, serials, historical supplier bills, people, or confirmations.
- Record duplicate SKU decisions and UOM conversions in explicit mappings.
- Migration scripts must support dry-run and idempotent reruns, with clear failure reports.
- On failures, rollback before accepting new writes; keep logs and checksums.

## Rollback rehearsal

An authorized operator must be able to restore a recent complete backup, identify code migration commit, revert app deployment and verify legacy workflows still work until final decommissioning.
