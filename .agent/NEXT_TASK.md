# Milestone 11B — human acceptance remains

Verified paired recovery checkpoint a21ba4b8e89fc9dc624eb8c016ccc5ce86a7926d on feature/kit-builder-milestone-1. No next feature milestone.

1. Perform docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md in a normal browser at http://127.0.0.1:3100 after npm run dev:kit-builder. Private synthetic credentials: .local-dev/pilot-accounts.json. Report scenario results, screenshots and physical print evidence. No visual acceptance occurred; do not retry EPERM.
2. Recovery PASS: new database experimind_pilot_restore_20261014141752742 and .local-dev/recovery/20261014141752742/restored-objects. Backup/manifest retained in sibling backup directory. Fresh restore and independent read-only --validate passed for all 85 public tables, schema, sequences, ledger/tenant relationships and attachment bytes. Ten pre-existing unreferenced objects preserved. Source untouched. Follow runbook 37 for future rehearsals; administrator authorized only for fresh database creation, no app privilege changes.
3. Keep QMS/signature/RMA mutations blocked with 503. Ownership/permission/signature-reference and RMA outer transaction/replay repairs remain deferred; packing QC/delivery/closure separate.
4. Configure host ACLs, HTTPS/proxy trust and encrypted offline backup retention before controlled hosting. No production access, deployment, main merge or blindly applying legacy migrations.

All 13 additive migrations applied; 16 legacy migrations intentionally absent. Recovery-script syntax/normalization checks PASS; prior 475 database-backed tests/64 files with --testTimeout=15000, typecheck/build PASS. Browser/physical print and host configuration remain acceptance gates.
