# Experimind Acceptance Journeys

## Scenario S1 — Multi-grade project with two packaging scopes

Given project G8=30, G9=20, G10=25, grade common crates=1 each, universal crates=1; when a published template is instantiated; then per-kit lines multiply by kit counts, common-crate lines by per-grade crate count, universal lines only by universal crate count. Show explainable trace and calculated totals; do not touch physical inventory.

## Scenario S2 — Customer-specific customization

Given School A generated from published Prastuti G8 v3; when operator removes one line, adds an optional DIY kit and modifies a pouch; then School A's effective requirements change but G8 v3 and other school projects remain identical to their original base.

## Scenario S3 — Make to stock then allocate

Given internally produced 100 finished MDF charts with input consumption and output QC; when later a school needs 30 charts; then it can reserve eligible finished stock, not buy raw MDF for units already available.

## Scenario S4 — Two projects race for stock

Given stock 120 and 20 reserved elsewhere, two buyers try to reserve 80 each; at most 100 total new reservations succeed. No negative available, no duplicate reservation after retry, and audit explains both attempts.

## Scenario S5 — Lab setup with survey

Given NGO requests laboratory setup; create project before customer confirmation, record site dimensions/photos/furniture/electrical needs, propose G8/G9/G10 kits + charts + signage + installation, quote after planning, execute work, package, deliver, install and attach handover evidence.

## Scenario S6 — Multi-delivery

Given one project with 3 batches, one batch delivered and two pending; project cannot close just because first batch dispatched. Demand/report clearly shows remaining quantity and setup not completed.

## Scenario S7 — Returnable workshop equipment

Given five multimeters for a workshop, issue them to named custodian, receive four in good condition and one damaged; stock availability reflects four releases and one quarantine; do not treat the workshop as a permanent customer sale.

## Scenario S8 — Procurement project and replenishment

Given Project X needs 100 LEDs and central min stock needs 500, purchaser creates PR lines for both and may combine into one PO while preserving intended allocations and receipts.

## Scenario S9 — No double decrement on packing

Given 20 kits moved from shelf to dispatch staging; picking should not reduce total on-hand and dispatch should remove 20 once. A retry does not remove an extra 20.

## Scenario S10 — Failed QC and rework

Given laser-cut item fails dimensional QC, output remains quarantined, can be reworked and reinspected; cannot be reserved as usable stock before passing.
