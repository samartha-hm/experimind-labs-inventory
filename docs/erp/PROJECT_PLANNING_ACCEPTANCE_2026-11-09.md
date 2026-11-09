# Project planning acceptance — 2026-11-09

- Controlled outage of only the isolated synthetic app: Projects displayed a load error and Retry, without an empty state. Restart and Retry restored saved projects. PostgreSQL remained running.
- Preserved viewer project preview: School A 2.8 m + School B 0.9 m = 3.7 m; verified on-hand 19.102, active reservations 1.12, available 17.982, incoming 0.097; both shortages zero. No project writes.
- Mobile trace now shows subject/grade names resolved from the exact approved version. Raw calculation and identity references remain available under Source references; browser expansion confirmed selection/version references.
- Demand table has a named, focusable scroll region, column headers and caption. At the mobile viewport its 746px contents stay within a 321px scroll region; no horizontal document overflow. Keyboard interaction still needs manual acceptance.
- Visually inspected [mobile dark trace](evidence/builder-2026-11-09/planning-trace-dark-375.jpg). Viewport override restored afterward.
- Fresh isolated PostgreSQL project/supply integration: 23 passed across two files, covering concurrency, tenant/permission isolation, decimal conversions, shortages, reservation cancellation and stock preservation.
- Fresh scoped UI/domain checks: 23 passed across three files. Typecheck, production build and diff whitespace check passed.

Remaining: writer planning UI, overrides/history and nonzero shortage workflow browser acceptance; long-name/deep-editor/keyboard and full theme/viewport visual coverage. This is a partial checkpoint, not 100/100 acceptance. D6 BLOCKED; pilot NO-GO. No company database reset, merge or deployment.
