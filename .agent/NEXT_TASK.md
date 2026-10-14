# Remaining Milestone 11 acceptance

Verified code checkpoint is complete; overall pilot acceptance is pending.

1. Install matching PostgreSQL client tools locally and rehearse paired database/private-object recovery into a new isolated database/root following docs/erp/37_PILOT_SECURITY_AND_RECOVERY.md. Do not overwrite the source or run the older production-oriented restore script.
2. Execute docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md using local synthetic users. No visual scenarios have been verified; do not retry the agent EPERM loop. Record navigation/save/reload/roles/errors and physical print outcomes privately.
3. Keep advanced QMS/signature mutations disabled. Before enabling them, repair tenant ownership, reference ownership, permissions and RMA transaction/idempotency; verify signature lookup ownership. Packing QC/delivery/closure remain separately verified.
4. Configure private host ACLs, HTTPS/proxy trust and backup retention before controlled pilot review. Preserve unreferenced attachment objects for reconciliation. Remote PostgreSQL TLS must verify certificates before cloud use.

Baseline verification: 475 tests/64 files PASS, typecheck PASS, frontend/PWA/server builds PASS, npm audit zero, isolated migrations 11/12 applied and original inventory/ledger fingerprints unchanged. No deployment authorization.
