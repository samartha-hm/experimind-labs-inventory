# Project planning acceptance — 2026-11-09

- Controlled outage of only the isolated synthetic app: Projects displayed a load error and Retry, without an empty state. Restart and Retry restored saved projects. PostgreSQL remained running.
- Preserved viewer project preview: School A 2.8 m + School B 0.9 m = 3.7 m; verified on-hand 19.102, active reservations 1.12, available 17.982, incoming 0.097; both shortages zero. No project writes.
- Mobile trace now shows subject/grade names resolved from the exact approved version. Raw calculation and identity references remain available under Source references; browser expansion confirmed selection/version references.
- Demand table has a named, focusable scroll region, column headers and caption. At the mobile viewport its 746px contents stay within a 321px scroll region; no horizontal document overflow. Keyboard interaction still needs manual acceptance.
- Visually inspected [mobile dark trace](evidence/builder-2026-11-09/planning-trace-dark-375.jpg). Viewport override restored afterward.
- Fresh isolated PostgreSQL project/supply integration: 23 passed across two files, covering concurrency, tenant/permission isolation, decimal conversions, shortages, reservation cancellation and stock preservation.
- Fresh scoped UI/domain checks: 23 passed across three files. Typecheck, production build and diff whitespace check passed.

## Writer and shortage workflow browser acceptance

- Created and reopened `SYNTHETIC browser planning acceptance 2026-11-09` using the isolated synthetic administrator. Its approved dynamic kit version 2 retained 20 Grade 6 sets; calculation produced 50 m demand, zero verified stock and a 50 m shortage.
- Saving a material override without a reason displayed `Overrides require a reason of 1 to 500 characters`. A reasoned 45 m override saved as project revision 2; recalculation produced 45 m demand and 45 m immediate/projected shortage.
- Expanded both revision snapshots: revision 1 retained 20 sets without an override; revision 2 retained those sets plus the 45 m override and its reason. Approved saved school revision 2 after explicit review confirmation.
- Through trusted purchasing, created PR `81fa138e-76ce-4e42-8103-2d84aa83fd1a` for 45 m against that approved demand, reviewed it (r2) and approved it (r3). The UI offered 45 m of PR coverage for a subsequent PO. No PO or receipt was created in this check.
- Attempting to reserve 1 m against zero verified stock was rejected with `Insufficient verified available stock; reduce quantity for a partial reservation`.
- Replaced project/school/material UUID labels in the trusted demand selector with names from existing project and inventory data; request cards now show school and material names. Missing names retain identity fallbacks. Source values, commitment lineage and approval behavior are unchanged.
- After production build and browser reload, reopened the project and verified the readable demand option and persisted approved PR r3. Typecheck, build and whitespace checks passed; the build still reports its existing large-bundle warning.

## Trusted PO and receiving browser acceptance

- Created PO `f55620db-8dd4-4bf4-83f4-f03ce30a21c1` for the approved 45 m PR coverage; reviewed and approved it through the UI (revision 3).
- Received 45 m at Shelf A as receipt `2f662035-e66b-4b32-b32e-485ebfc676a7`. Pending QC and quarantine both retained zero verified stock, 45 m incoming, 45 m immediate shortage and zero projected shortage.
- Accepted the quarantined receipt after inspection confirmation. Recalculation showed 45 m verified on-hand, zero reservations, 45 m available, zero incoming and zero immediate/projected shortage. The accepted receipt disappeared from the inspection selector and the operation button was disabled.
- Receiving now resolves school/material names and shows the project name in the selected-source summary. Expanded Receipt source references verified the original project, school, material, approval, PO and coverage IDs.
- Reloaded the production build and reauthenticated the synthetic administrator to verify persisted names and source references. At 375 px, document width remained 375 px. Viewport restored afterward. This is a layout check; full visual and keyboard acceptance remains outstanding.
- Typecheck, production build and whitespace checks passed. Existing large-bundle warning remains.

Remaining: production/packing/delivery acceptance; long-name/deep-editor/keyboard and full theme/viewport visual coverage. This is a partial checkpoint, not 100/100 acceptance. D6 BLOCKED; pilot NO-GO. No company database reset, merge or deployment.

## Trusted workflow build and readiness checkpoint

- Found a frontend build configuration regression: setting trusted workflow flags only in the server runtime environment did not enable their Vite-compiled panels. Added `npm run build:with-env -- <environment-file>` to load the chosen environment before the existing frontend/server build. Default build behavior and feature gates remain unchanged; environment files stay private.
- Built with `.local-dev/excellence-runtime/builder-app.env` and reloaded the isolated app. Production, packing/QC and dispatch/delivery panels rendered. The current synthetic project has no approved work orders/output or frozen packing plan; production showed its prerequisite message. Closure displayed missing packing/installation/custody evidence and the existing 45 m claim hold, with closure disabled. No ownership policy was introduced.
- Opened the global production queue and inspected an existing synthetic work order and its pending-QC output without submitting an operation.
- Revisited the historical package deep link `b5aecf4a-72f2-4f57-9b4d-097962c40300` in the current synthetic tenant. Packing and dispatch lookup both reported the package unavailable. With no output selected, Create frozen school plan was disabled. This verifies current unavailable-package handling; it does not establish that the historical package exists or that QC acceptance passes.
- Validation: environment-aware production build, script syntax check and TypeScript check passed. Six focused production/packing/delivery test files passed all 48 tests. The test runner required workspace-scoped TEMP/TMP to avoid a sandbox temporary-file rename denial. Existing large-bundle warning remains.
- No production issue/output, QC attestation, dispatch, school receipt, installation or closure was submitted in this checkpoint. Physical inspection, transaction/retry acceptance and complete visual/keyboard coverage remain outstanding. D6 BLOCKED; pilot NO-GO.
