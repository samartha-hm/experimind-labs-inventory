# Milestone 7: reservations and procurement

Use only the retained isolated PostgreSQL development database on loopback 55432 and ERP on 3100. Never reset, seed or import company data. Browser acceptance remains pending because the available browser bootstrap previously failed with EPERM; HTTP/PostgreSQL acceptance is verified.

## Workflow

1. Log in, open a saved project and choose its school/site and inventory item. Reserve a positive quantity in an explicitly supported unit. Unknown or partially verified stock cannot be reserved. Adjust, release or cancel active reservations with a reason; these actions never change physical stock.
2. Recalculate requirements. Gross demand, verified on-hand, all active reservations, free stock, incoming supply and shortages are separate. Immediate shortage credits the project's own reservations and fulfilled quantities. Projected shortage also credits approved incoming lines explicitly assigned to that project. Other projects' reservations consume free stock; general procurement is never silently allocated to a project.
3. Create a request from the selected site's uncovered demand, or enter manual lines in Purchase Orders. Manual requests support editable drafts, explicit units/conversion, quantities, notes and a QC flag. Review and approve before creating an order for an existing or new tenant supplier. Review and approve the order before receipt.
4. Record partial deliveries into a declared, previously counted physical stock location. Pending and quarantined receipts remain unavailable. An authorized inspector accepts or rejects with a reason. Acceptance posts one movement to the existing stock ledger; rejection posts none. A reviewed/approved line explicitly configured without QC accepts at receipt.
5. Open immutable history snapshots. Reopen the project/order and recalculate. Planning never writes ledger movements. Reservation fulfillment is an explicit authorized API transition requiring a physical location; no production, preparation, delivery or automatic allocation workflow is introduced.

## Quantity and integrity rules

- Exact four-place stock quantities, six-place explicit conversion factors; reject missing, ambiguous or inexact conversions.
- Transactional item locks prevent competing reservations exceeding verified balances. Stocktake adjustments cannot invalidate active reservations or remove complete verification coverage.
- Current database roles authorize every tenant operation: viewers read; configured staff write; inventory staff/managers review and inspect; managers/admins approve. Client role/tenant claims do not grant access.
- Revision checks reject stale edits. Every write requires an `Idempotency-Key`; matching actor/input replay returns its original result, while mismatched reuse conflicts.
- All deliveries, including rejected deliveries, consume their approved PO allowance. Replacement goods require a new approved order. Pending/quarantined quantities remain incoming but are never physical available stock. Accepted quantities leave incoming and enter the ledger. No prices are inferred from historical data; these quantity orders carry no approved valuation.
- Final receipts, final reservations, supply audit snapshots, operation records and verified ledger movements are immutable. Sites with reservation/procurement history cannot be removed. Release active reservations before archiving a project.

## Development acceptance

Authenticated HTTP acceptance used a new synthetic single-site project with 3.3 m demand and the retained synthetic 2 m opening stock. Reserving 2 m left physical stock at 2 m and shortage at 1.3 m. A generated 1.3 m request was reviewed, approved and ordered with supplier provenance. A pending 0.5 m delivery did not affect stock; acceptance and replay produced exactly one ledger movement and 2.5 m physical stock. A rejected 0.3 m delivery added nothing. Final free stock was 0.5 m, immediate shortage 0.8 m and remaining incoming 0.5 m. Repeated previews preserved ledger, legacy inventory and unverified legacy movements.

Ignored local records: `.local-dev/milestone7-acceptance-result.json`, credentials and command logs. Browser clicks/layout/reload remain unverified; API/database persistence and reopen are covered by focused integration tests.

## Migration and rollback

`1791676800004-AddReservationsAndProcurement` adds reservation/request/receipt/audit/idempotency tables and nullable supply provenance to existing orders and ledger. It retains the installed Milestone 6 guard and extends it without editing the previous migration. Run `node --env-file=.env.kit-builder-development node_modules/tsx/dist/cli.mjs scripts/migrate-supply-planning-dev.ts` only against its guarded isolated development database.

Empty-schema rollback/reapply is tested. Populated rollback deliberately refuses to discard operational history; retain the schema and use a forward repair or disable access. Legacy masters and movements are not backfilled or changed. No production migration or deployment is authorized.
