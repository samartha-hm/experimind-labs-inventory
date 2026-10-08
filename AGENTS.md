# ERP agent router

## Start and scope
- Work in `erp-development/`; inspect branch and `git status` before editing or committing.
- Read `.agent/SESSION_HANDOFF.md` and `.agent/NEXT_TASK.md`, then use `docs/erp/INDEX.md` to open only specifications relevant to the task.
- Current user instructions and confirmed business decisions take precedence over older hypothetical examples.
- Keep changes on the feature branch; no merge to main, deployment, or next milestone without authorization.
- Repository conventions: `.github/copilot-instructions.md` and relevant `.github/instructions/` files.

## Essential invariants
- Preserve company inventory, names/descriptions, and history; historical quantities/prices/locations remain unverified. Never reset, clean, overwrite, or seed company data.
- Use only the isolated development/test databases and synthetic data. Never initialize a nonempty database; keep secrets, `.env`, databases, and generated artifacts out of commits.
- Schema changes require an explicit migration task and a preservation/rollback plan; instruction tasks must not alter application code or data.
- Enforce authenticated tenant isolation and current-user RBAC on every operation; reject client-supplied ownership or privilege claims.
- Shared legacy operational APIs and aliases fail closed: authentication/role checks followed by unavailable responses until tenant-safe replacement is approved.
- Kit Builder is dynamic: start with an empty catalog; employees create and edit templates. No mandatory spreadsheet, programmer-authored catalog, or hardcoded kit rules.
- Keep activity composition and packing separate; do not duplicate shared equipment per activity. Project/site overrides never mutate masters.
- Published template versions are immutable; revisions create drafts and historical projects retain their referenced versions.
- Multi-school projects preserve each site's grade/subject quantities, template versions, ownership, and delivery destination; schools are not warehouses.
- Confirmed Prastuti rules: Science common crate = one per grade 8/9/10 set; Maths = no common crate; universal crate = one per complete Science 8+9+10 set.
- `completeScienceSets` must be an explicit nonnegative integer and no greater than any grade's Science count. Never infer it; missing confirmation blocks automatic suggestions.
- Pack per site before compatible aggregation; preserve destinations and ownership. Expansion/shortage calculations must not mutate stock.
- Authoritative details and the Draft Kit CRUD review gate are linked in `docs/erp/INDEX.md`.

## Efficient execution and verification
- Use scoped `rg` searches and targeted file ranges; exclude `node_modules`, build output, logs, database files, and unrelated subprojects.
- Read relevant specifications on demand; do not repeat repository audits or load every V5 document for routine edits.
- Make the smallest safe diff. Run affected tests first and expand checks when failures or changed scope justify it.
- Run the full suite, typecheck, and build once at milestone review. Never skip or conceal security/persistence failures; report causes and checks not run.
- Before a local commit, inspect the diff and status and explicitly exclude sensitive/generated files. Do not claim historical checks as freshly verified.

## GitHub checkpoint workflow
- GitHub is authoritative. After successful verification, review status/diff, explicitly stage completed code/docs without secrets, `.env`, dumps or generated artifacts, and create logically separate descriptive commits.
- Push the current feature branch to origin and verify its remote commit. Then update the short handoff, commit/push it, and verify again. Report branch, hashes, checks and GitHub status; failures block completed-feature checkpoints.
- Never force-push or rewrite shared history. No main merge or deployment without approval.

## Continuity and reporting
- Update `.agent/SESSION_HANDOFF.md` and `.agent/NEXT_TASK.md` once per completed slice, not after commands.
- Update `DECISIONS.md` only for real decisions and `PROJECT_STATE.md` only for actual status changes; update other records when relevant.
- Keep handoff at most 250 words: branch, milestone, verified checks, modified paths, blockers, and next small task; no transcript or verbose logs.
- Follow `.agent/CONTINUITY_PROTOCOL.md` for continuity details.
- Final replies: result, tests, changed paths, blockers/next step; approximately 10–15 lines.
