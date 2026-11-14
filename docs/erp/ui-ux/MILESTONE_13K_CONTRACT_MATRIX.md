# Milestone 13K — supported draft contracts

Legacy Projects remains the default. Precision Operations is a bounded development/test integration of existing `ProjectPlanningService` contracts, with no migration or new requirement approval workflow.

| Contract | Supported action / authority | Boundary |
| --- | --- | --- |
| Project draft | Name, client, notes through `PUT /api/v1/planning-projects/workspace/projects/:id` | Uses the existing legacy PUT DTO and transactional `service.save`; existing commercial links and project overrides are preserved, not edited |
| School assignment | Add a fresh UUID school; edit name, address, location, contact, schedule, fulfillment and notes | Existing school/selection IDs remain stable; removing schools is unavailable |
| Kit revision | Add a selection referencing the tenant's immutable approved catalog from `GET .../workspace/approved-kits` | No draft kit reference, approval, mutation, selection replacement or removal; adding a selection adds demand |
| Grade / subject / quantity | Existing `SelectionQuantities` and server quantity engine; independent grade quantities, explicit complete sets | Blank remains unknown; explicit zero remains zero; Science common/universal rules and independent Mathematics remain authoritative |
| School overrides | Existing selection-context override quantity and required reason | Scoped to the selected school/selection; project defaults survive unchanged |
| Persistence | One authenticated PUT saves all schools and creates one immutable project revision | Existing projects only; draft must have named schools, approved selections and complete valid quantity contexts |
| Approved snapshots | Approved kit identities, approval actors/source revisions and project history displayed | Historical views have no editor. No independent approved school-requirement state exists; saved allocations must not be described as approved school requirements |
| Concurrency | Required project revision; existing pessimistic project lock and transactional revision comparison | Even different schools share one project revision: one simultaneous winner, stale loser gets 409; no merge or silent overwrite |
| Ambiguous / repeated save | UI ref prevents duplicate submission; stale identical retry rejected by service | Any failed save retains and freezes the local draft until explicit authoritative discard/reload; no automatic mutation retry |
| Tenant / RBAC | Active DB user and organization checked on every request; DB role replaces stale JWT role | Existing writers: admin, super_admin, staff, manager, editor, inventory_staff, project_staff. Viewer reads only. Cross-tenant project is 404; forged writer claim is 403 |
| Closed project | Existing completion state excludes editor and rejects workspace PUT with 409 | Existing DB completion guard still protects races; no reopen action |
| Demand / shortages | Existing server preview, identified as the current saved revision | Unsaved drafts do not produce client-calculated material demand. Unknown verified stock is never converted to zero |
| Operational actions | Existing independent read-only stage evidence | No reservation, purchasing, production, packing/QC, dispatch, completion, archive or approval action exposed |

## Opt-in and rollback

Require `NODE_ENV=development` or `test`, `PROJECTS_WORKSPACE_READ_ONLY=true`, an exact organization in `PROJECTS_WORKSPACE_ORGANIZATIONS`, and additionally `PROJECTS_WORKSPACE_EDITING=true` for writes. The historical READ_ONLY flag remains the workspace availability gate; the separate editing flag grants no role. Disabled editing returns 405 and hides the editor; disabled workspace returns 404 and leaves legacy Projects available. Production remains disabled.

Restart after flag/source changes when using documented `DISABLE_HMR=true` recovery. Disable `PROJECTS_WORKSPACE_READ_ONLY` to roll back the integration. Saved project data needs no migration or reversal and remains readable through legacy APIs/UI. Workspace responses use private no-store caching.

## Navigation and limits

Project/app/legacy/history navigation is blocked while a draft is dirty, saving or unresolved. Browser unload registers its native warning. School switching retains the complete local draft; school search and native keyboard buttons preserve explicit selected-school identity. Save success reloads authoritative detail, history and demand; a failed read retains same-project local detail. Catalog failure disables editing. Existing limits remain 200 loaded projects, 50 displayed snapshots and at most 100 schools per project.

Deferred: new project creation, school/selection deletion or replacement, commercial/default-override editing, school requirement approval/version workflow, per-school concurrent merge, autosave and offline replay. Use legacy Projects for supported actions outside this UI after saving/discarding; consequential operations require separate authorization.
