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

Remaining: trusted PO/receiving/QC continuation, production/packing/delivery acceptance; long-name/deep-editor/keyboard and full theme/viewport visual coverage. This is a partial checkpoint, not 100/100 acceptance. D6 BLOCKED; pilot NO-GO. No company database reset, merge or deployment.
