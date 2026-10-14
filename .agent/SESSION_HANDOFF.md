# Milestone 11B — paired recovery PASS; human acceptance pending

Branch feature/kit-builder-milestone-1. Verified recovery checkpoint a21ba4b8e89fc9dc624eb8c016ccc5ce86a7926d; baseline db965aef995c31cb2c8f638ace8287425614057e. Resolve final handoff commit via git rev-parse HEAD and git ls-remote origin refs/heads/feature/kit-builder-milestone-1.

Browser: runbook 34 contains Windows startup commands, http://127.0.0.1:3100, four synthetic logins, click/expected-result matrix and evidence reporting. Passwords remain private .local-dev/pilot-accounts.json. HTTP attachment login/upload/download/replay/role/tenant checks passed; no browser operated. Human visual and physical print acceptance pending; do not retry EPERM.

Recovery PASS 2026-10-14 19:47 IST: PostgreSQL/server clients 17.5. User authorized existing administrator solely for CREATE DATABASE owned by kitbuilder_dev; no privilege changes. Restore and independent retained-pair validation used application account. Target experimind_pilot_restore_20261014141752742; private pair .local-dev/recovery/20261014141752742 (backup and restored-objects). All 85 public tables, sequence states, migrations, tenant relationships, verified ledger balances/units/sequences and reciprocal picks match. One attachment record matches bytes; ten existing unreferenced objects preserved. Source hashes unchanged. Equivalent literal-array casts narrowly normalized; changed literals/columns still fail. Failed targets retained. Corrected Windows .txt extension on ignored administrator env file; no credentials committed. Runbook 37 documents backup/validation/rollback and hosting prerequisites.

All 13 additive migrations 0000–0012 applied; 16 legacy migrations intentionally absent. QMS/signature/RMA mutations stay 503/deferred; separate pilot packing QC/delivery/closure permitted.

Verification: paired restore/revalidation, script syntax and normalization checks PASS. Prior 475 database tests/64 files (15-second timeout), typecheck/build PASS; no application code changes since. No production access, deployment, main merge or next feature.
