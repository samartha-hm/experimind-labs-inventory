# Execution plan

Current milestone: Draft Kit CRUD is implemented and awaiting review; do not start activity composition, packing, publication, or deployment without authorization.

1. For each authorized slice, inspect branch/status and the handoff/next task, then locate relevant authorities through `docs/erp/INDEX.md`.
2. Make a narrow change while preserving inventory, tenant/RBAC, fail-closed legacy APIs, isolated dev databases, versioning, and confirmed business rules in `AGENTS.md`.
3. Run affected checks first. At milestone review, run full tests (including security and PostgreSQL persistence), typecheck, and build once; report failures and causes.
4. Update handoff and next task once when the slice completes. Change decisions/project state only for real decision/status changes.
5. Inspect commit diff and sensitive/generated exclusions, commit/push verified feature work, verify origin, then commit/push the short handoff. No force-push, main merge or deployment.

Current instruction-optimization slice ends after documentation validation. The next application task is the Draft Kit CRUD review described in `docs/erp/28_DRAFT_KIT_BUILDER_RUNBOOK.md`.
