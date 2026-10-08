# Next task

Review the existing Draft Kit CRUD milestone using `docs/erp/28_DRAFT_KIT_BUILDER_RUNBOOK.md`.
Verify tenant/RBAC isolation, concurrent revision conflict handling, soft archive, and restart persistence against isolated synthetic development/test databases.
At this milestone review, run the full suite with PostgreSQL integration enabled, typecheck, and build once; record failures and causes.
Do not initialize nonempty databases or alter company data. Verified feature checkpoints must follow the GitHub workflow in AGENTS.md; further builder milestones, main merge and deployment need approval.
