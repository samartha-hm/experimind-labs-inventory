# Continuity protocol

- Start with branch/status, `AGENTS.md`, `SESSION_HANDOFF.md`, and `NEXT_TASK.md`.
- Use `docs/erp/INDEX.md` to read relevant specifications only. Open decisions, plans, or code when the current task requires them.
- Verify claims with scoped evidence; distinguish historical results, current checks, and checks not run.
- Work on one bounded slice. Use targeted searches and affected tests first; run full tests, typecheck, and build once at milestone review.
- Report security/persistence failures and their causes; never omit them to obtain a passing result.
- Once per completed slice, update `SESSION_HANDOFF.md` (maximum 250 words) and `NEXT_TASK.md` (one small next task).
- Update `DECISIONS.md` only when a real decision changes; update `PROJECT_STATE.md` only when actual project status changes.
- Update backlog, changelog, questions, or execution plans only when their contents materially change, not after each command.
- Handoff records branch, milestone, verified checks, modified paths, blockers, and next task. Exclude transcripts, verbose logs, credentials, and data.
- Before a local commit, inspect status/diff and exclude secrets, environment files, databases, and generated artifacts. Record uncommitted work honestly.
- After successful verification, commit/push the feature checkpoint, verify the remote hash, then update/commit/push the short handoff and verify again. Never force-push; further milestones, main merge and deployment require approval.
