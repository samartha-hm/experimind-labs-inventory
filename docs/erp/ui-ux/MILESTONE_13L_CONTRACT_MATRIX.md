# Milestone 13L — requirement review and approval contracts

Audited 2026-10-17, branch `feature/kit-builder-milestone-1`, baseline
`eea82c0cf12f7f33c061d5d0559c5120771e63c9` (local/remote matched).
**Supported saved-requirement review; requirement approval BLOCKED.**

## Contract and effect matrix

| Action | Existing contract / controls | Effects and 13L disposition |
| --- | --- | --- |
| Review saved project/schools | `GET /api/v1/planning-projects/workspace/projects/:id`; active DB user and tenant; project revision must match preview/history; `no-store` | Read-only project, schools, current server demand, latest 50 snapshots, approved Kit provenance. Integrated comparison of exact saved revisions, selected school, all schools including removals, metadata and overrides. |
| Save planning allocations | Existing workspace `PUT .../projects/:id`; DB-backed writer role, opt-in editing, expected project revision, locked project, normalized validated content, approved tenant Kit references | Changes planning project/sites/version links and immutable actor-attributed revision snapshot. Recalculates demand; may stale downstream demand revisions. Existing 13K editor retained, separate from review. Does not approve requirements. |
| Approve project/school requirements | **No endpoint, approval state, approved-revision identity, approval actor or immutable approved-requirement snapshot contract exists** | Unavailable. No confirmation, approval success, invented endpoint/schema or downstream approval effect. Current/stale/concurrent/repeated attempts denied. Saved snapshots must never be labeled approved requirements. |
| Reject / return / clone | No supported requirement workflow contract | Unavailable; no simulated transitions. |
| Approve Kit template | `POST /api/v1/product-templates/:id/approve` and Studio counterpart; existing writer controls, parent lock, exact draft revision, validation, unique source-version/revision | Publishes immutable Kit version and approval provenance. Existing service only; not added to Projects. Does not approve a school's allocations or rewrite projects. |
| Supply / production / packing execution | Independent existing services require current demand revision; Packing approval locks project and rejects stale demand with 409 | Remains separate. Review performs no reservation, purchase, production, packing, stock or ledger mutation. Requirement readiness is not execution readiness. |

## Identity, permissions and integrity

- Workspace gates: development/test only, `PROJECTS_WORKSPACE_READ_ONLY=true`
  and exact organization allowlist; editing additionally requires
  `PROJECTS_WORKSPACE_EDITING=true`. Legacy is default. Production remains blocked.
  Kit Studio and Packing flags unchanged.
- Active tenant readers may review. Existing writers are `admin`, `super_admin`,
  `staff`, `manager`, `editor`, `inventory_staff`, `project_staff`; viewer cannot
  write. No requirement approver permission exists. JWT role is not authoritative.
  Unauthenticated requests return 401; viewer writes 403; cross-tenant reads 404.
  Unsupported authorized workspace mutations return 405 without disclosing data;
  disabled workspace returns 404. Legacy requirement approval path returns 404.
- Planning saves use expected revision and locking; unique project/revision and
  immutable snapshot triggers preserve history. Published Kits and Kit approvals
  have immutable triggers and unique source revision approval identity. Kit
  approval retry idempotence is not evidence of requirement approval idempotence.
- Review names project UUID, saved revision, save actor/time and baseline
  actor/time. It excludes unsaved editor values. School/selection identity keys
  prevent array reorder from attributing another school's changes. Switching
  history retains the selected school when present, otherwise selects the first.
- Comparison is bounded to loaded history (50 snapshots) and initially 50 changed
  fields per table with explicit expansion. No earlier history/actor is invented.
  Historical Kit labels can be unavailable if no longer selected currently;
  saved UUID references remain visible. Historical demand is unavailable.

## Business semantics and recovery

Existing server demand remains authoritative: Science common crates per grade,
universal crates only for explicit complete Science 8–10 sets, independent Math,
shared packaging without double-counted material, school quantities and immutable
approved Kit references. This change adds no material arithmetic or stock lookup.
Unknown quantities/stock remain unknown, distinct from explicit zero.

Current validation and stock warnings remain in the current demand view; historical
review does not claim historical stock or current execution readiness. Failed
refresh reports an error while retaining identified saved evidence; refresh and
legacy return remain available. There is no approval request to lose, retry or
confirm. A future approval integration requires an independently authorized backend
contract specifying revision checks, roles, validation, immutable approval identity,
audit, concurrency/idempotence and all downstream transaction effects.

Sources: `src/routes/v1/planning-projects.ts`,
`src/features/projects/projectsWorkspaceContract.ts`, `src/services/ProjectPlanningService.ts`,
`src/services/ProductTemplateService.ts`, `src/services/SupplyPlanningService.ts`,
`src/services/ProductionPlanningService.ts`, `src/services/PackingService.ts`,
`src/migration/1791417600002-AddProjectPlanning.ts`.
