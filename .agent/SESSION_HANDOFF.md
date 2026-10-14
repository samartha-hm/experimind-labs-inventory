# Milestone 11B — human acceptance ready; recovery blocked

Branch feature/kit-builder-milestone-1. Verified remote code/runbook checkpoint: 4caaf9656e82eae0b5422bdcfbc2b65e09071a1c; baseline db965aef995c31cb2c8f638ace8287425614057e. Resolve final handoff commit with git rev-parse HEAD and git ls-remote origin refs/heads/feature/kit-builder-milestone-1.

Browser: docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md has exact Windows commands, URL http://127.0.0.1:3100, four synthetic pilot accounts, click/expected-result matrix and screenshot reporting. Private passwords .local-dev/pilot-accounts.json. HTTP login/attachment upload/download/replay/viewer and other-tenant denial passed; stock ledger unchanged. No browser operated; visual and physical print acceptance pending. Do not retry EPERM.

Recovery: server and approved portable clients PostgreSQL 17.5. Full consistent database dump/object copy/manifest retained privately in .local-dev/recovery. Source tenant/verified ledger/attachment checks passed. Fresh restore failed because kitbuilder_dev lacks CREATEDB; source unchanged. Automatic review rejected development-password reuse with postgres as unauthorized credential probing; no administrator login occurred. Await explicit administrator authorization and correct ignored .local-dev/recovery-admin.env (RECOVERY_ADMIN_DATABASE_URL). Guarded script uses administrator only for fresh CREATE DATABASE owned by kitbuilder_dev. No privilege grants/overwrites. Runbook 37 documents validation/rollback.

Migrations: all 13 additive suffixes 0000–0012 applied; 11/12 referred to suffixes. Sixteen legacy migrations intentionally absent; never blindly apply. Advanced QMS/signature/RMA mutations stay 503; deferred ownership, permissions and RMA transaction/replay work. Pilot packing QC/delivery/closure remain separate.

Verification: 475/64 database-backed tests PASS (15-second timeout; default 5-second label PDF timeout), focused packing 17 PASS; typecheck/build PASS; script syntax/refusal preflight PASS. No application code changes, deployment, main merge or production access.
