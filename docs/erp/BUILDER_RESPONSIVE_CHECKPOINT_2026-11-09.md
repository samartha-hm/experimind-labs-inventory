# Builder responsive checkpoint — 2026-11-09

## Implemented

- Nested subject, grade, activity and material-note fields shrink within narrow editors.
- Builder checkbox labels and add actions have a minimum 44px height; archive actions wrap and search has visible focus styling.
- Material search retains its icon and wraps long inventory text.
- Browser-reproduced mobile header overlap is corrected with separate rows below the large breakpoint and bounded organization names.
- Floating history controls sit above mobile bottom navigation; the history console fits the viewport width and has a smaller mobile height limit.

## Current verification

Latest approval-dialog checkpoint supersedes older counts below: 600 tests passed / 132 skipped (85 files passed, 9 skipped); 31 focused recovery/permission tests passed; final typecheck, production build and diff checks passed. Earlier 37 PostgreSQL integration tests were not rerun for this UI-only change.

Native approval confirmation is replaced with a themed, labelled modal. Browser checks passed initial Cancel focus, Tab to Confirm, Escape restoring trigger focus, and persisted immutable approval version 2 while draft revision 1 remained editable. Archive returned “Kit archived” and removed the synthetic kit from active search results.

Both themes showed no document overflow at 375/768/1440/3840 on a nested unsaved editor. A light mobile screenshot confirmed separated header controls and bottom navigation. Viewport reset. Viewer interaction, controlled browser error recovery and the complete screenshot matrix remain pending; no pixel-perfect or 100-percent claim.

- Focused save-recovery and permissions tests: 29 passed after the header/history changes.
- TypeScript --noEmit and production frontend/backend builds passed after these changes; git diff --check passed.
- Previous responsive checkpoint full suite: 598 passed, 132 skipped. This was before the header/history changes; do not report it as a fresh full-suite run.
- Fresh isolated PostgreSQL requirement-approval integration run: 37 passed. Existing synthetic test fixtures supplied the source for browser acceptance.
- After explicit user approval, a fresh synthetic browser schema, restricted roles and synthetic accounts were prepared in the loopback test database. Private credentials remain under ignored .local-dev; the application runs at 127.0.0.1:3104.
- Runtime, identity and receipt-ledger connections were independently checked: all have superuser, bypass-RLS, create-database and create-role privileges disabled. No company database was seeded or reset.

## Observed browser results

- Writer created a dynamic kit with subject, grade, activity and an inventory-selected material at 2.5 m per set.
- Save produced revision 1; returning through the library reopened the persisted values. Revision history displayed the saved revision.
- Four sets produced the expected 10 m requirement.
- Before the final header/history fixes, document width matched viewport width at 375, 768, 1440 and 3840 pixels. These measurements alone did not reveal control overlap.
- A 375px screenshot exposed overlapping header hit targets and a history toolbar covering bottom navigation. After rebuilding, mobile visual inspection and header bounds confirmed the correction; theme switching and navigation worked. Dark desktop rendering at 1280px had no document overflow.
- Temporary viewport override was reset.

## Remaining acceptance

The earlier native approval confirmation stalled automation; the replacement modal now passes approval, archive and approval keyboard acceptance as recorded above. Viewer interaction, controlled browser error recovery and the complete post-fix light/dark breakpoint screenshot matrix remain unverified. Do not infer success from the focused unit tests or claim pixel-perfect/100-percent completion.

Continue from the existing isolated fixture without recreating it or using owner credentials as application credentials. Preserve historical fixtures and private .local-dev / .test-tmp artifacts. D6 remains BLOCKED and pilot NO-GO. No merge, deployment or ownership-policy expansion is authorized by this checkpoint.
