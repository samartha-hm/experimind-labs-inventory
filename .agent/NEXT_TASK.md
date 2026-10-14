# Next task — Review Milestone 6

Milestone 6 implementation is complete and verified. Stop for user review; do not begin another milestone, merge or deploy.

Browser acceptance remains pending because bootstrap returned EPERM. In a browser-enabled fresh chat, use the stocktake and project preview steps in docs/erp/30_INVENTORY_FOUNDATION_RUNBOOK.md. Keep production/company data untouched.

Use existing isolated PostgreSQL on 127.0.0.1:55432 and ERP on loopback 3100. Never initialize/reset/seed retained databases. Credentials, synthetic acceptance results and logs are ignored under .local-dev/. Check short handoff and GitHub HEAD first.
