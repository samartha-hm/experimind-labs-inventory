# Complete Milestone 11B acceptance

Verified checkpoint: 4caaf9656e82eae0b5422bdcfbc2b65e09071a1c on feature/kit-builder-milestone-1. No next feature milestone.

1. Obtain explicit authorization for the existing isolated postgres administrator and its correct local credential. Automatic review rejected guessing/reusing the development password. Store RECOVERY_ADMIN_DATABASE_URL privately in ignored .local-dev/recovery-admin.env; never send a password in chat. Run the guarded paired recovery command in docs/erp/37_PILOT_SECURITY_AND_RECOVERY.md, then its retained-pair --validate command. Only fresh database/object paths; preserve failed targets. Portable PostgreSQL 17.5 clients are already installed; application role remains without CREATEDB.
2. Perform docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md in a normal browser at http://127.0.0.1:3100 after npm run dev:kit-builder. Four pilot credentials are private in .local-dev/pilot-accounts.json. Record scenario results/screenshots and physical print evidence. No visual acceptance has occurred; do not retry EPERM.
3. Keep advanced QMS/signature/RMA mutations blocked. Ownership, permissions, signature references and RMA outer transaction/replay repairs are deferred; separate packing QC/delivery/closure remain permitted.
4. Before controlled hosting, configure private ACLs, HTTPS/proxy trust and encrypted offline retention. No production data, deployment, main merge or legacy migration application.

All 13 additive Kit Builder migrations applied; 16 legacy migrations intentionally absent. Verification: 475 database-backed tests/64 files PASS with --maxWorkers=2 --testTimeout=15000, typecheck/build PASS. Consistent backup/source integrity PASS; fresh paired restore blocked by database-creation permission. Source database and attachments never overwritten.
