# Next batch: builder visual acceptance, then project planning

Latest checkpoint: Product Library now distinguishes a failed read from an empty library and offers Retry. A controlled outage of only the isolated synthetic app showed the error; restarting the app and clicking Retry restored the library. The app is running again at http://127.0.0.1:3104.

Fresh verification: 602 tests passed / 132 skipped (85 files passed, 9 skipped); 33 focused recovery/permission tests passed; typecheck and production build passed. Two new tests cover read retry without mutations and ignoring failure after unmount. Earlier isolated PostgreSQL integration result: 37 passed, not rerun for this UI change.

Browser acceptance already passed writer save/reopen/history, 2.5 m x 4 = 10 m preview, immutable approval version 2 with draft revision 1 retained, approval Cancel/Tab/Escape focus, and archive disappearance. Viewer definition fields are disabled and mutation actions absent; enabled quantity-preview inputs are intentionally local calculations.

See docs/erp/BUILDER_RESPONSIVE_CHECKPOINT_2026-11-09.md for screenshot evidence and remaining visual coverage. Invalid racing viewport captures were discarded. Full visual matrix remains incomplete; no pixel-perfect or 100-percent claim. Finish visual acceptance, then follow batch 3 in docs/erp/ERP_BUILD_BATCH_PLAN_2026-11-09.md.

Reuse the existing synthetic fixture and restricted app roles. Private accounts/env remain under ignored .local-dev/excellence-runtime. Do not print credentials, recreate fixtures, use owner credentials in the app, or reset data. Preserve .local-dev and preexisting untracked .test-tmp. D6 BLOCKED; pilot NO-GO. No merge/deploy or ownership-policy expansion.
