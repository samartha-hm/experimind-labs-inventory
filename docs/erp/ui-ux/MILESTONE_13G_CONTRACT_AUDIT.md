# Milestone 13G — live read-only Packing/QC contract

Scope: authenticated Precision Operations workspace over existing packing records.
No schema, packing/QC mutation, dispatch, inventory transaction or synthetic QC
rehearsal is introduced. Legacy PackingPanel remains the default.

Audit inputs: AGENTS.md, SESSION_HANDOFF.md/NEXT_TASK.md, 13F integration and
acceptance, CURRENT_STATE_AUDIT.md, PRIORITY_WORKSPACE_SPECS.md, pilot browser
acceptance/results, and the authoritative route/service/types below.

## Sources and interpretation

All paths below are under `/api/v1`. `src/routes/v1/packing.ts` authenticates
bearer JWTs and reloads active User membership and role from PostgreSQL on every
request. `PackingService` scopes every record lookup to the authenticated
organization; URL IDs and JWT role claims never confer access.

| Workspace field | Authoritative source | Meaning / limitation |
|---|---|---|
| Destination queue | GET packing/ → PackingService.list | Latest 200 tenant orders, ordered by updated_at; no pagination contract |
| Project / school | GET packing/orders/:id → order.project_id, site_id, snapshot.project_name/site_name | Frozen packing context, not current school master data; manual orders can omit these |
| Requirement context | order.demand_revision and snapshot lines/versions | Revision used to create packing; not proof current requirement is still approved. Creation/release validate planning preview in transaction |
| Packing revision / status | order.revision, status, updated_at | Authoritative order state; refresh is explicit, no live subscription |
| Physical identity | order.snapshot.packages | UUID, PK code, kind, name, pack_number, parent_id; includes kit/batch/subject/grade, crate kinds, box/partition/pouch where defined |
| Definition identity | package.version_id/version_number, selection_id, definition_id | Immutable source template/version and selection; some manual/container fields absent |
| Location hierarchy | package.parent_id, subject, grade | Definition containment only; not warehouse/bin or physical geolocation |
| Required package contents | actualMaterials(order, package.id) in packingTypes.ts | Snapshot allocation plus approved substitutions/additions; item/name/unit/quantity/source line; parent may hold no direct materials |
| Order quantities | detail.materials | Service-derived planned/picked/assembled/checked/completed/remaining; completed is zero unless order ready. Parent counts include hierarchy, not independent kit units |
| Available / shortage | detail.materials.available/shortage/stock_status | Existing ledger/reservation verification; nullable when unverified, never converted to zero |
| Package progress | execution.progress[package.id] | Assembled and QC pending/accepted/rejected; absent progress displays not recorded assembled/pending, never approval |
| Operator/reviewer | assigned_team/employee_id; progress.packed_by/at, checked_by/at | Authorized actor UUIDs and timestamps; names and team membership permissions are unavailable |
| Inspection evidence | progress.checks/notes; six qcChecks | Existing material/quantity/placement/packaging/stickers/instructions booleans; missing checks explicitly lack evidence. No scanner/photo evidence inferred |
| Exceptions | execution.exceptions | Kind/notes/report actor/time and correction actor/time/reason, including unresolved exceptions elsewhere in order |
| Approved usage changes | execution.changes | Substitute/additional materials and approver/time/reason; no client recalculation of stock |
| Activity links | package.activity_ids joined to snapshot.versions subjects/grades/activities | Names only for explicit snapshot links; no inference from parent |
| Recorded activity | detail.history (SupplyEvent) | Latest 100 order revisions with actor/time; not complete inspection history or scanner telemetry |
| QR identity | GET packing/packages/:id; packingLabels.packageDestination | UUID resolved in tenant; existing endpoint also includes delivery custody. New workspace uses same PackingService.package without custody; then reloads consistent order detail |
| Permissions | active User in packing router; PackingService approval/qc checks | Read: admin/super_admin/manager/staff/inventory_staff/production_staff/project_staff/editor/viewer. Other/inactive/mismatched membership rejected; assignment is not permission |

No per-package per-material completed quantity, physical scanner event, location
scan, photo inspection attachment, resolved actor display name, or capability
matrix is available in the packing contract. Project private attachments exist,
but are not package inspection evidence; downloads create attachment audit events
and are deliberately outside this read-only workspace. No attachment GET is made.

## Read-only adapter and rollback

GET `packing/workspace` returns flag availability and current database role/user.
GET `packing/workspace/orders`, `/orders/:id`, `/packages/:id` reuse the service
above; no new business calculation. Responses are private/no-store. Non-read
requests are rejected (405 after existing auth/idempotency guards; those guards
may reject earlier with 400/403). No mutation handler is wired to the workspace.

Both `PACKING_WORKSPACE_READ_ONLY=true` and an exact authenticated organization
in `PACKING_WORKSPACE_ORGANIZATIONS` are required; NODE_ENV must be development
or test. Defaults and production are off. In Projects, explicitly open the
read-only workspace from the unchanged operational panel; return with the toggle.
Direct development entry: `/?packing_workspace=1`. Existing label URLs remain
`/?packing_package=UUID` and keep their legacy authorized lookup.

Disable either flag/restart server to restore legacy UI and reject workspace data
routes with 404; no migration or data rollback. Existing mounted pages revalidate
on refresh/lookup; data already displayed is a historical read until refreshed.
Deployment and production enablement are outside 13G.

## Interaction boundary

UUID, PK-UUID and same-origin root ERP QR URLs are accepted. Arbitrary URLs,
foreign origins, extra query parameters and malformed identities are rejected;
scanned URLs are never navigated. Keyboard wedge input + Enter only looks up.
Unknown lookup retains selected context with an explicit error. Order read
failures clear detail to avoid leaving permission-denied information presented
as current. Cross-project lookup in a project workspace is rejected.

Native controls have 48px minimum height, visible focus, responsive outline and
ancestry navigation. Package selection focuses its heading after render; lookup
returns focus to input. Explicit refresh, loading, empty and error states expose
limitations. Next action is review contents/evidence or unresolved exceptions;
no suggested action implies persistence.
