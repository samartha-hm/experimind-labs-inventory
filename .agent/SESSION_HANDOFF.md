# Milestone 13K review checkpoint — 2026-10-17

Branch: feature/kit-builder-milestone-1. Feature checkpoint
880773e23061382fb6aed666724acfb924a1b66a pushed; local/remote hashes verified.
This separate continuity checkpoint follows; resolve its HEAD with git.

Read docs/erp/ui-ux/MILESTONE_13K_ACCEPTANCE.md and
MILESTONE_13K_CONTRACT_MATRIX.md. Opt-in development/test draft editing uses
existing project save, approved kit snapshots and server quantity contracts.
Includes school metadata/quantities/overrides, saved-revision demand,
DB-backed tenant/role checks, closed-project guard, project revision conflicts,
retained/frozen ambiguous saves and explicit authoritative reload.
Historical views remain read-only. Unsupported actions are documented.

Verified: focused 20 tests; full 541 tests in 74 files; typecheck;
frontend/PWA/server builds. Authenticated synthetic browser save/reopen,
two-tab conflict, dropped committed response, validation, 403/reload failure,
keyboard school selection and dirty navigation passed. Scoped axe has zero
violations/incomplete findings at 1280/768/360/320px; screenshots inspected.
Physical devices, staff, screen-reader and native unload-dialog checks pending.

83 business tables reconciled: only four planning tables changed; 79 unchanged.
One of six projects advanced r1→r4 with three actor-correct snapshots;
original histories unchanged. Full-server flag-off API/browser rollback and
legacy r4 interoperability passed. No operational changes or migrations.

Modified project UI/API/tests, validation scripts and acceptance/index docs.
Ignored evidence: .local-dev/ux-13k and 13k logs. Temporary server/proxy stopped;
retained PostgreSQL remains running. Unrelated AGENTS.md edit remains unstaged.
Existing DISABLE_HMR=true workaround used; watcher cause remains unresolved.
Stop for review before further integration, approval, main merge or deployment.
Use /new or /compact.
