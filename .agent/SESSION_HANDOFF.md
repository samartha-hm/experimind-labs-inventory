# Session handoff — Milestone 11 attachment checkpoint

Branch feature/kit-builder-milestone-1. M10 baseline fed6787d558131a3d6bcdeadb1d4be846ea04183 preserved. Phase A manual browser acceptance script pushed at 9df52db50da47c3f96f250337a7ac46a058e10aa. Agent browser import fails EPERM; separately invoked Node can read runtime but Playwright is absent. Bounded investigation ended; no browser scenarios visually verified. Repeatable manual matrix: docs/erp/34_PILOT_BROWSER_ACCEPTANCE.md.

Phase B implements private attachments, immutable metadata/audit, generated tenant/object keys, authenticated downloads, file signatures/types/10 MiB limit, current-user permissions, upload replay and project UI. Runbook: docs/erp/35_PRIVATE_ATTACHMENTS_RUNBOOK.md. Files stay outside web/Git; default ignored .local-dev/attachments. Configure production-host ACLs separately. PDFs are untrusted, no malware scanning. Failed metadata commits can leave unreferenced objects; preserve for reconciliation.

Fresh focused PostgreSQL/HTTP/storage checks: 19 tests/2 files PASS; typecheck PASS. Migration AddPrivateAttachments1792195200011 applied only to isolated localhost:55432 development database. Original nine inventory/twelve ledger fingerprints unchanged; attachment tests create zero stock movements. Empty rollback/reapply and populated rollback refusal verified. Full suite/builds not yet rerun for M11.

Remaining: Phase C shared PostgreSQL label layout revisions and UI; Phase D security/dependency review, backup/restore exercise, full checks. Actual browser/physical print acceptance pending. No deployment/main merge/force-push. Resolve current checkpoint with git rev-parse HEAD and remote HEAD; verified code commit follows.
