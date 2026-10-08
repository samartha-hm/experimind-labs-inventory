# Inventory, Reservations, Production and Fulfillment Rules

## One authoritative stock model

Master Item (name, SKU, UOM, tracking) is distinct from StockBalance (by item + location + lot/serial where relevant), from StockMovement (immutable transaction log). Existing fields such as `InventoryItem.quantity`, `StockLocation.quantity`, `StockLedger.running_balance` should be **reconciled** before switching truth ownership. Never blindly sum parallel quantity stores.

## Stock definitions

- **On hand:** physical stock owned/managed in counted locations, including staging/quarantine if tracked as locations.
- **Quarantined:** not ready to allocate for ordinary use.
- **Reserved:** physical free stock committed to a named demand.
- **Available-to-promise now:** eligible on-hand − active reservations − quarantined stock, with location/lot restrictions.
- **Incoming:** open PO or approved planned production; not on-hand and not available to promise now.
- **Short now:** net unfilled requirement minus allocatable immediately available stock, avoiding subtracting a project's own reservations twice.

## Event correctness

- Receipt increases stock only when physically received in the correct status/location.
- Quarantine status means quantity physically present but unavailable; passing QC releases it.
- Reservation does not change physical stock.
- A **pick** from storage to staging is typically an internal transfer; it must not reduce total company on-hand and then be deducted again on dispatch.
- **Dispatch** may remove goods from company stock/transfer ownership as per transaction policy, exactly once.
- Manufacturing consumes inputs and receives outputs with both movements in the same reliable operation (or controlled WIP if multi-step).
- Returns reverse/reintroduce physical stock according to item condition and ownership.
- Adjustments require permission and reason; ledger remains immutable.

## Concurrency requirement

When two users reserve the last 100 units, use one database transaction that locks relevant stock-balance rows or uses an equivalent conditional update, validates availability, then inserts the reservation/updates reserved balance. Use deterministic lock ordering to avoid deadlock, an idempotency key for retries, and authorized rollback/release. Race tests must prove reservations do not exceed eligible stock.

## Inventory correctness tests

- Receiving PO twice with same idempotency key posts once.
- Reservation contention across two projects cannot oversell.
- Picking to staging changes bin, not total on-hand.
- Dispatch posts exactly once.
- Cancel release doesn't erase history.
- Serial items cannot have fractional/duplicate units.
- Lot expiry/quarantine exclude unavailable quantities.
- Production raw consumption/output do not invent material.
- A packed unit and its components are not double-valued in finished inventory.

## Project readiness

Use separate progress axes: material, procurement, production/preparation, QC, packing, delivery, setup. Percentages are derived from verified transactions/units. Avoid averaging unlike units (e.g. 10 tiny screws vs a major lab installation) into an unqualified one-number readiness. Present blockers and requirement counts beside any summary.

## Procurement for project and general stock

A PurchaseRequestLine may allocate portions to multiple demand IDs and a general replenishment bucket. Goods receipt creates physical stock first; reservation/allocation is separate and traceable. Partial receipts supported.

## Packing

Template = definition; PackingUnit = actual physical item. Project → delivery → physical box/crate → pouch → packed contents; label printing/scanning links stable IDs. Activity pouch has a sticker; each box has a sticker; selected items only get stickers when rules require them. Common crate belongs to a grade; universal crate belongs to the intended project/delivery grouping. Multiple deliveries and repacking/corrections must be auditable.

## Workshop returns

Separate issue-to-operator, project use and expected return record; physical return condition check determines what re-enters available stock and what remains quarantined/damaged/missing.
