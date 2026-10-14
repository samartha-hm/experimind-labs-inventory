# Next task — Review Milestone 7

Milestone 7 implementation and HTTP/PostgreSQL acceptance are verified. Stop for user review; do not begin Production/Preparation, merge or deploy.

Browser acceptance remains pending because runtime bootstrap returned EPERM. In a browser-enabled fresh chat, follow docs/erp/31_RESERVATIONS_AND_PROCUREMENT_RUNBOOK.md; verify reservation and purchasing controls, partial receipt QC, history and refreshed project shortages.

Existing isolated PostgreSQL is on 127.0.0.1:55432 and ERP on loopback 3100. Never initialize/reset/seed retained databases or touch company production data. Synthetic acceptance stock is now 2.5 m with 2 m active reservations; do not rerun the acceptance script's original 2 m baseline assertion blindly. Credentials, results and logs remain ignored under .local-dev/.

Read short handoff and verify GitHub HEAD first. Use /new or /compact before further work.
