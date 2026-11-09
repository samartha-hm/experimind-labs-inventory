# Builder responsive checkpoint — 2026-11-09

## Implemented

- Narrow editor fields shrink; material search wraps long text; checkbox labels and add actions provide 44px targets.
- Mobile header controls occupy separate rows with bounded organization names; history controls sit above bottom navigation.
- Approval uses a themed, labelled modal with keyboard focus restoration.
- Failed library reads show an alert and Retry instead of a misleading empty state. Late failures after unmount are ignored.

## Verification

- Fresh suite: 602 passed / 132 skipped, 85 files passed / 9 skipped. Skipped tests are not acceptance evidence.
- Focused recovery/permission tests: 33 passed. Typecheck and production build passed.
- Prior isolated PostgreSQL requirement-approval integration: 37 passed; not rerun for the UI-only changes.
- Synthetic writer saved/reopened a dynamic kit and revision history; 2.5 m per set x 4 sets produced 10 m.
- Approval persisted immutable version 2 while editable draft revision 1 remained; archive removed the synthetic kit from active search.
- Approval modal: initial Cancel focus, Tab to Confirm, Escape restores trigger focus.
- Viewer: definition inputs disabled and save/approve/archive/create actions absent. Quantity-preview inputs remain usable for local calculations.
- Controlled outage: stopped only the verified loopback synthetic app, entered Product Library, observed load failure and Retry; restored app and Retry loaded saved kits. PostgreSQL remained running.

## Visual evidence

[Dark mobile, 375 x 900](evidence/builder-2026-11-09/viewer-dark-375.jpg) and [light mobile, 375 x 900](evidence/builder-2026-11-09/viewer-light-375.jpg) were captured after viewport settling and visually inspected. Header controls, read-only kit fields and bottom navigation render without the earlier overlap. [Light desktop, 1440 x 900](evidence/builder-2026-11-09/viewer-light-1440.jpg) was also inspected.

Earlier DOM measurements showed no horizontal document overflow at 375/768/1440/3840 in both themes. Immediate captures during that matrix included stale compositor rendering; those unverified captures were discarded. Width measurements alone do not prove layout quality. Temporary viewport override was reset.

## Remaining acceptance

Complete settled tablet/desktop/4K light/dark captures, deeper editor/preview and library states, long-name and keyboard coverage. Existing captures cover the editor's upper viewport, not every nested control. No pixel-perfect or 100-percent claim. Continue project planning/shortages after this visual pass.

The isolated app uses restricted roles with superuser/bypass-RLS/createDB/createRole disabled; private credentials remain ignored. No company database was modified or reset. Preserve fixtures. D6 BLOCKED and pilot NO-GO; no merge/deploy or unapproved policy expansion.
