# Next task — Recover browser control for D5

Read SESSION_HANDOFF.md and the 2026-10-28 evidence matrix in
`docs/erp/D5_ERP_READINESS_AND_PILOT_GATE.md`.
Checkpoint: `4a6af9b1920359eb22316f9e7bedc8c79b6496b1`.
D5 software acceptance remains BLOCKED; pilot remains NO-GO.

Recover reliable browser input/native-confirm handling first. Fresh tabs rendered
authenticated dashboards but input returned without navigation after a native
stocktake confirmation interrupted the runtime. Use fresh targets; do not loop
on stalled tabs. Catch click interruptions before querying a dialog. Never bypass
required confirmation or substitute direct database mutations for browser proof.

Stocktake `4c6e3a5f-db11-4c79-9fd2-a892f640997e` is authoritatively NOT POSTED:
approved r4, four audit revisions, zero ledger entries. Re-read supported APIs
before any new posting attempt. `.local-dev/d55-stocktake-read.json` records it.
Static local serving restored prompt APIs; development slowdown is unresolved.

After input recovery, complete the fresh authenticated school/project → production
→ packing/six-check QC → dispatch/partial delivery → installation/closure chain and
browser denial/retry/accessibility matrix. Existing fixtures are not browser proof.

Fresh 608 tests passed, two opt-in skips; typecheck and frontend/PWA/server build
passed. Reuse prior actual recovery unless assumptions change. Synthetic-only
attestation authorization persists; label evidence SIMULATED / SYNTHETIC TEST
EVIDENCE. Keep historical activation and operational flags disabled by default.
Preserve AGENTS.md and `.test-tmp/`; no deployment, real stock or main merge.
Use /new or /compact before continuation.
