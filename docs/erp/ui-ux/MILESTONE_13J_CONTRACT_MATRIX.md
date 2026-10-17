# Milestone 13J — read-only Projects contracts

Reviewed against checkpoint `0d014bc54c4c261269e6b2f20ceb3fe455f0fc4f`.

| Fact | Authoritative source | Presentation and limits |
|---|---|---|
| Project/school identity and destinations | PlanningProject / PlanningSite through ProjectPlanningService.view | Tenant-owned stable UUIDs; saved project revision, not independent school approval |
| Kit/subject/grade requests | Saved site selections, `grade_quantities`; immutable ProductTemplateVersion | Display persisted numbers; missing is unknown, explicit zero stays zero |
| Science complete sets | `complete_sets[crate.id]` and existing previewQuantities | Display explicit bundle separately; never infer min(grade quantities); Mathematics independent |
| Draft vs approved | Approved published kit snapshot + KitTemplateApproval | Approval actor/time/source draft revision; current draft edits are separate. No school requirement draft/approval contract exists |
| Requirement history | PlanningProjectRevision | Latest 50 immutable saved snapshots, actor/time; not a historical demand calculation |
| Material demand/shortages | ProjectPlanningService.preview | Existing calculator, UOM conversion, verifiedAvailability and supplyAvailability; null stock stays unknown; no UI calculations |
| Reservation/purchasing | GET supply-planning?project=UUID | Explicit project/site links only. PO links are `planning_lines`, not legacy `lines`. Latest 200 per list; absence cannot prove completion |
| Production | GET production-planning | Persisted linked order status/planned quantity/unit/demand revision; no inferred readiness or manufactured output quantity |
| Packing/QC | GET packing; GET packing/orders/UUID | Explicit project/site links, revision, required/assembled/checked/completed per material unit, package QC actor/time, unresolved exceptions. No approval affordance |
| Delivery/installation | GET delivery/projects/UUID | Existing server receipt summary, installation required/status/acceptance. Summary may use first school packing order; packing list is separate. No independent all-orders readiness claim |
| Completion/reopening | Same completion progress response | Persisted completion status/last actor/reason/acceptance; history count and server blockers. Exception closure is not proof that every blocker cleared |

## Adapter and authorization

`GET /api/v1/planning-projects/workspace-access` exposes only flag availability.
`GET /workspace/projects` and `GET /workspace/projects/:id` reuse the existing tenant-owned planning service. Bearer authentication, explicit nonzero organization, active database user and current database role checks precede all routes. Planning readers retain existing permissions; each operational GET independently applies its own RBAC. Forbidden evidence is displayed unavailable, never substituted from another tenant or service.

Detail assembles existing project, expected-revision preview, history and tenant-approved version/approval reads. A mismatched history head returns 409. These guards prevent combining different project revisions; independent operational APIs are not a global transaction snapshot. Refresh reconciles evidence. GET/HEAD only; mutations to workspace routes fail. Responses are private/no-store. Existing legacy writes are unchanged and have no UI entry here.

## Gaps intentionally retained

- No independent school draft/approval record, historical demand endpoint or authoritative global progress percentage.
- No inference from absent or unlinked operations, list truncation, unrelated statuses or unknown stock.
- No new calculations, authorization grants, schema, ledger movements or business transitions.
- Historical version labels unavailable when no longer selected in the current project are explicit; historical saved quantities remain inspectable through revision snapshots.

## Flag and rollback

Opt in only with `NODE_ENV=development` (or test), `PROJECTS_WORKSPACE_READ_ONLY=true`, and exact tenant UUID in comma-separated `PROJECTS_WORKSPACE_ORGANIZATIONS`. Open Projects, then “Open Projects / Schools workspace”, or use `?projects_workspace=1` after authentication. Legacy is default; unset the flag and restart to restore it. Workspace endpoints become 404 and the legacy interface remains unchanged. No migrations or data rollback. Kit Studio/Packing flags are independent.
