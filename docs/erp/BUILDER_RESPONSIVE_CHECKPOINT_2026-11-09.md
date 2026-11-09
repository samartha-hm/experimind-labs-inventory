# Builder responsive checkpoint — 2026-11-09

## Implemented

- Subject, grade and activity name fields, and material notes, retain a preferred flex basis while allowing shrinkage inside narrow nested editors.
- Activity/material checkbox labels and add-subject/grade/activity actions have a minimum 44px height.
- Archive confirmation actions wrap; library search has a visible focus-within ring.
- Material search retains its icon, allows the input to shrink and wraps unbroken inventory result text.

These are code-inspection corrections, not completed visual acceptance or a 100/100 rating.

## Verification

- Focused productLibrarySaveRecovery: 25 passed.
- Full Vitest suite: 598 passed, 132 skipped (85 files passed, 9 skipped). Skipped database integration coverage is not fresh PostgreSQL evidence.
- TypeScript --noEmit passed.
- Vite production frontend and esbuild backend build steps passed; git diff --check passed.
- The first sandbox test attempt failed before collection with a temporary-file EPERM rename; the outside-sandbox rerun passed.

## Browser acceptance remains pending

The existing loopback PostgreSQL cluster recovered without resetting data. Sandbox process visibility initially obscured recovery; a conflicting startup attempt interrupted it, after which it recovered using consistent outside-sandbox execution. Read-only metadata confirmed experimind_kitbuilder_test and 87 synthetic schemas, but historical D6-F restricted fixture roles no longer exist. Its app cannot authenticate.

Automatic approval review rejected preparing a fresh synthetic clone using the existing preparation logic because that creates persistent schemas, database login roles, synthetic users and private credential files using migration privileges. No replacement fixture was created. Specific user approval is required before retrying that action; do not bypass the rejection or use privileged owner credentials as app credentials.

After approval: preserve historical fixtures, use a new requirement_test_* schema in 127.0.0.1:55432/experimind_kitbuilder_test, random restricted runtime/identity/ledger roles and synthetic accounts; keep credential files private. Verify database boundaries before browser actions. Complete writer/viewer dynamic selection, quantity, save/reopen/history, approval/archive recovery, keyboard and light/dark checks at 375px/tablet/desktop/4K with screenshots. No company data, reset, deployment or policy expansion. D6 BLOCKED; pilot NO-GO.
