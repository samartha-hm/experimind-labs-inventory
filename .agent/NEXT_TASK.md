# Next task — Review Milestone 8

Milestone 8 implementation and authenticated development HTTP/PostgreSQL acceptance are verified. Stop for review; do not begin Milestone 9, merge or deploy.

Browser acceptance remains pending because runtime bootstrap returned EPERM. In a browser-enabled fresh chat, follow docs/erp/32_PRODUCTION_AND_PREPARATION_RUNBOOK.md; verify recipe/version controls, work order release/reservations/issues, partial QC and rework, reload persistence/history and project stock previews.

Existing isolated PostgreSQL is on 127.0.0.1:55432 and ERP on loopback 3100. Never reset, initialize or seed retained databases. Synthetic M8 input/output balances are 11 m/6 m; retained older M6/M7 examples remain separate. A failed acceptance-script setup left a separate synthetic draft count; it posted nothing. Credentials/results/logs remain ignored under .local-dev. Do not blindly rerun scripts with initial-baseline assertions.

Read the short handoff and verify GitHub HEAD first. Use /new or /compact before further work.
