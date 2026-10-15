# Milestone 12 — pilot readiness, 2026-10-15

Branch feature/kit-builder-milestone-1. Verified implementation checkpoint
f42cc2120823a5c4fd79f522487aeccf53ff7614 pushed; remote hash matched.
Resolve final handoff SHA with git rev-parse HEAD and git ls-remote origin
refs/heads/feature/kit-builder-milestone-1.

Read docs/erp/39_PILOT_READINESS_AND_FINAL_ACCEPTANCE.md. Recovery validator now
reconstructs only the saved PostgreSQL 17 source-version header before hashing;
DDL/data/object checks remain enforced. Historical retained fingerprints match
9 inventory/12 ledger rows. Current browser fixture is a distinct 17.4 environment
with 12 inventory/20 ledger rows; original operational continuity is unproven.

New current paired baseline: .local-dev/recovery/20261015133946131;
experimind_pilot_restore_20261015133946131 and sibling restored-objects.
85 tables/two sequences, 11 attachments/27 objects validate; sixteen orphans
preserved. Original retained pair also validates. Read-only reconciliation PASS.
No stock or privileges changed. Thirteen additive migrations present.

Four synthetic labels: .local-dev/pilot-readiness/four-label-samples.pdf.
103×80 mm, PDF/raster QR/browser destination checks PASS; preview/reprint leaves
packages/ledger unchanged. User agreed to physical testing; results pending.
Do not declare physical acceptance PASS. ERP restarted on 127.0.0.1:3100.

476 tests/65 files, four schema tests, typecheck/builds PASS; bundle warning remains.
Changed recovery helper/tests, docs37–39/index and PROJECT_STATE. Private evidence,
credentials, PDFs and exports remain ignored. Preserve unrelated AGENTS.md edits.

Operational gates: development app role is already SUPERUSER/CREATEDB; saved
recovery-admin secret is stale. Least-privilege app/recovery configuration, backup
custody and named warehouse/staff/data approval precede operational use. QMS,
signature/RMA remain blocked. No rollout, real stock entry, merge or deployment.
Next: collect physical results; use /new or /compact before another milestone.
