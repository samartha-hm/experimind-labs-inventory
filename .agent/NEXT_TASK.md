# Next batch: complete dynamic builder browser acceptance

Read docs/erp/BUILDER_RESPONSIVE_CHECKPOINT_2026-11-09.md and ERP_BUILD_BATCH_PLAN_2026-11-09.md. Header/history responsive fixes are built and typechecked; focused recovery/permission tests passed 29/29. Fresh PostgreSQL approval integration tests passed 37/37. Earlier full-suite result was 598 passed/132 skipped, before the latest CSS changes.

Explicit user approval allowed a new isolated synthetic fixture. Existing restricted app is http://127.0.0.1:3104; private files are .local-dev/excellence-runtime/builder-app.env and builder-accounts.json. Do not print credentials, re-run preparation over existing outputs, or run the app using owner credentials. All three app connections were checked without elevated PostgreSQL role privileges. Preserve historical fixtures, .local-dev and .test-tmp.

Writer save/reopen, dynamic material selection, revision history and 2.5 m x 4 = 10 m preview passed in browser. Mobile header overlap and history-toolbar obstruction were reproduced and fixed. Approval confirmation stalled automation; approval/archive outcome is unverified. Replace stale browser tabs and inspect dialogs before interactions. Complete writer approval/archive, viewer access, keyboard focus, controlled error recovery and post-fix light/dark at 375px/tablet/desktop/4K with screenshots. Temporary viewport was reset. No pixel-perfect claim from node tests.

D6 BLOCKED; pilot NO-GO. No company data changes, resets, merge/deploy or unapproved ownership policies.
