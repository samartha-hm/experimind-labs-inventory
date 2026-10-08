# End-to-end Experimind Workflows

## A. Customer institutional lab setup

1. Create a customer/lead and Project in **discovery** with no order requirement.
2. Record structured site survey(s): school, rooms, measurements, infrastructure, equipment, photos, drawings, customer notes; attach revisions and staff member.
3. Plan deliverables: multi-grade Prastuti, DIY kits, charts, name boards, equipment, site installation, workshop/training.
4. Select published templates and add project-specific lines/quantity overrides; snapshot source template version.
5. Prepare/revise quotation wherever commercially appropriate. Record confirmation when received; do not mandate one quote position in project workflow.
6. Generate demand, reserve available materials and finished kits; identify shortages, external purchases and internal preparation.
7. Assign tasks and dependencies; execute PO/receipt, make/prepare/assembly, QC and stock movements.
8. Build packing hierarchy, apply activity-pouch, box and selected item labels; verify physical completeness.
9. Create one or multiple delivery batches. Dispatch, receive onsite, complete setup/training, collect handover evidence, close project.

## B. Repeated Prastuti customer project

Project School A selects **Prastuti G8 v3**, G9 v2, G10 v4, each with independently specified kit counts. Project gets a snapshot. School A removes an item, adds a custom DIY kit, and changes G9 pouch quantity. Shared common crates are grade-specific, and a universal crate belongs to the agreed project grouping. All changes affect only School A; master templates remain immutable.

## C. Internal production for future sales

Create an **internal make-to-stock Project** for 100 prepared kits or MDF charts; expand template/BOM; purchase or issue inputs; complete production; QC; receive output into finished stock. A later School B project allocates finished goods from stock. Prevent creating artificial demand to buy the underlying components again for already completed finished kits.

## D. Workshop with returns

Create Workshop Project; issue five multimeters/other reusable equipment to the team, record custodian, due return date and condition; return, inspect, release or mark damaged/missing. A different customer project can sell/transfer equivalent items permanently. **Disposition must be specified at issue/delivery**, not inherited globally.

## E. Multiple projects share an item

For on-hand 120, existing reservations 20, new Project A needs 50, B needs 80, C needs 40: available-to-promise begins at 100. Planner displays shortages and lets an authorized user allocate. Reservation uses database transactions/locking; never let two parallel users reserve the same stock. Incoming PO quantities are visible but do **not** count as currently available.

## F. Partial completion

For requirement 100 units: 100 required, 60 reserved, 40 received from supplier, 80 QC released, 45 packed, 30 dispatched. These are related event-based measures; don't store a single status pretending to represent all of them. Enforce monotonic movement/event constraints where appropriate, and support correction/reversal by audited actions.

## G. Procurement

Project demand or min-stock replenishment → purchase request → buyer review/approval → optionally supplier comparison → PO → partial/full receipts → QC quarantine/release → stock movement → allocate to project or stock. A PO can combine lines serving multiple project demands; references must remain traceable.

## H. Packing labels

Published kit-template packaging definition (activity boxes, pouches, grade common crates, project universal crate) → project-specific packing plan → physically created packing units → packed contents → barcode/label identifiers → QC completeness → delivery batch. Some components need item labels; others must not be assigned needless labels.

## I. Installation completion

Delivery received ≠ installation done. Complete site setup tasks, training/handover, document acceptance (photos, signatures/files optional), then close project only when required deliverables are accepted or explicitly waived.

## Exception flows to support

- Product or kit template changes after a project starts: do not propagate silently; offer reviewed rebase/version comparison later.
- Damaged incoming materials: quarantine, no available stock.
- Substitution: approved equivalent item with recorded reason and quantity/UOM matching.
- Production scrap/rework: input consumption and output handled separately, audited.
- Partial PO receipts and split deliveries.
- Cancellation after reservation: release reservation; never delete movement history.
- Reopened site survey and changing scope: store previous version, recalculate affected demand, identify already fulfilled lines before changing any operational commitments.
