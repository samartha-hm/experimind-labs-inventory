# Milestone 13L-R — Requirement approval reconciliation

Investigation: 2026-10-17. Source baseline: `287fc5c8164e4b52b953725154c2bf2153beec0a`, branch `feature/kit-builder-milestone-1`. Documentation only; the contract below is a proposal, not an available API.

## 1. Finding: D — absent authoritative requirement approval

Project requirement approval requires a new authoritative backend contract. The current backend saves and calculates project requirements, retains immutable revisions, and approves Kit templates. It has no project/school requirement approval producer, status transition, permission or endpoint. Neither an alternative endpoint (A) nor an internal requirement-approval implementation awaiting exposure (B) was found. Historical/synthetic approved requirement records (C) were not established: approved Kit records and presentation fixtures do not constitute requirement approvals.

This conclusion covers the traced application, migrations, tests and planning documentation. It is not a forensic certification of every database row or out-of-band historical write; no company database audit was performed. Do not infer a supported write contract from an existing row or a response field named `approvals`.

## 2. Evidence and record provenance

Paths below are relative to the repository root; line references refer to the source baseline.

| Evidence | Actual behavior |
| --- | --- |
| `src/entity/PlanningProject.ts:4` | Project holds content, revision and author metadata. School rows at line 19 have no independent approval/version state. `PlanningProjectRevision` at line 36 is saved history, not an approved snapshot. |
| `src/services/ProjectPlanningService.ts:26`, `:108` | Normalizes school selections and saves the complete project under one expected revision. Transaction locks the project, calculates demand, saves school/link changes and inserts immutable history with the saving actor. No approval operation exists. |
| `src/services/ProjectPlanningService.ts:73`, `:149` | Calculation requires tenant-owned published, approved Kit versions. History returns saved project revisions, including archived-project history; latest 50 are returned. Live availability is informational calculation context. |
| `src/routes/v1/planning-projects.ts:59`, `:74`, `:83` | Workspace detail returns project/preview/history/versions/approvals. Those approvals are `KitTemplateApproval` rows for selected versions. Public planning routes provide create/save/preview/archive/history, without requirement approval. School requirements are nested project content, not a separate approval API. |
| `src/services/ProductTemplateService.ts:212` | The real approval producer: locks a Kit draft, validates its expected revision and material references, creates a published immutable version and revision, then inserts `KitTemplateApproval` with actor/time. Repeated approval of the same still-current source revision returns its existing result; stale source revisions are rejected first. |
| `src/routes/v1/product-templates.ts:86`, `:123` | `POST /api/v1/product-templates/:id/studio/approve` and `POST /api/v1/product-templates/:id/approve` approve a **Kit template**, using its revision. They cannot approve a planning project or school. |
| `src/migration/1791417600002-AddProjectPlanning.ts:19`, `:31`, `:37` | Creates Kit approval and planning history tables, tenant/version references, and immutable published-version/approval/history triggers. It creates no requirement-approval table or transition. |
| `src/routes/v1/planning-projects.ts:38`, `:41` | Bearer authentication, active database user, explicit organization context and database role authority. Existing draft writer roles do not establish a requirement-approver permission. Workspace routes also require environment/org opt-in. |
| `server.ts:221`, `:263`; `src/middleware/legacyOperationsGate.ts` | Modern planning router is mounted separately. Legacy operational project routes are gated with `LEGACY_OPERATIONS_DISABLED`; they are not an alternative supported approval contract. `src/services/ProjectManagementService.ts:59` is the legacy localStorage/static portfolio model. |
| `src/design/precision/fixtures.ts:7`, `:88` | Explicitly synthetic presentation fixtures include an approved mapping; they do not create operational requirement approvals. |

The original [planning runbook](../29_PROJECT_REQUIREMENT_PLANNING_RUNBOOK.md) uses approval for publishing complete **Kit drafts**, followed by selecting approved versions for school planning and saving before calculation. Its approval-provenance migration and synthetic approval checks concern Kits. The [13L matrix](MILESTONE_13L_CONTRACT_MATRIX.md) and [acceptance](MILESTONE_13L_ACCEPTANCE.md) correctly leave requirement approval blocked. Existing Kit approvals have source revision, approver and time; saved project snapshots have saving actor/time. Neither should be relabeled as business requirement approval.

## 3. Downstream and lifecycle constraints

Execution currently uses saved demand revisions, without a requirement-approval gate:

- `src/services/SupplyPlanningService.ts:118` validates the current revision and recalculates shortage demand transactionally; procurement lines retain `demand_revision` and demand basis. Reservations are separate operations. Procurement approval is separate.
- `src/services/ProductionPlanningService.ts:74` validates project/site/revision together against current calculated demand before attaching those references to a work order. Recipe approval is separate.
- `src/services/PackingService.ts:36`, `:75` retains project/site/demand revision and checks revision freshness during packing transitions. Packing approval is separate.
- `src/migration/1792108800010-AddProjectCompletion.ts:24`, `:42` serializes closure and guards existing operational tables against closed-project writes. A new approval table needs its own closure protection; existing triggers do not automatically cover it.

Risk: adding an approval record alone will not make downstream execution approval-dependent. Changing execution eligibility would be a separate business and compatibility decision. Approval must not silently reserve stock, move inventory, create procurement, start production or alter packing.

## 4. Smallest proposed authoritative contract

**Proposed next milestone: Milestone 13M-A — Authoritative project requirement approval backend.** Obtain the decisions in section 7 before implementation. Limit this milestone to approval attestation and readback; UI integration follows separately.

### Scope and API

Approve one complete saved **project revision**, including every school and its demand basis. Schools receive snapshot evidence within that approval, not independent state transitions. A subsequent save makes the prior approval historical/stale by revision comparison; it does not mutate or delete it. There is no second school revision counter, rejection, revocation, reopen or bulk approval in the initial contract.

Proposed `POST /api/v1/planning-projects/:id/requirement-approvals` accepts only `expected_revision` and a required idempotency key. It accepts no client snapshot, organization, approver, timestamp or approval status. Add tenant-authorized readback by project/revision and idempotency key, plus immutable approval detail/history, including archived projects. Return the durable approval ID, source revision, snapshot schema/hash, actor/time and whether that revision remains current. A replay may return its historical result without claiming the newer revision is approved.

### Authorization and preconditions

Authenticate an active database user and explicit tenant, resolve permissions from the database, and require a dedicated requirement-approval capability with deny-by-default behavior. Do not automatically grant approval to every current draft writer. Scope every project, site, version, material, approval and readback query to the same tenant; reject cross-tenant references without disclosing data.

For a new approval, require an existing nonarchived, open project and the exact current saved revision. Revalidate its normalized complete school selections, approved tenant Kit versions, material references, explicit quantity bases and conversion provenance. Block structural errors and any material/UOM readiness failures selected by policy. Stock shortages are informational, not an implicit approval veto. Unsaved browser edits are never approved.

### Snapshot, concurrency and atomicity

Create an additive immutable requirement-approval entity/table referencing the existing immutable project revision. Store normalized per-school inputs, Kit/version identities, gross calculated demand, material/UOM conversion IDs and factors, calculator/snapshot schema version and canonical content hash. Preserve educational activity, physical material, pouch and partition distinctions. Exclude live stock availability from the immutable demand decision, or clearly identify it as time-specific informational evidence.

Use a single database transaction and the same project row lock used by save/closure. Recheck revision, openness and tenant references under that lock; calculate from the saved snapshot; atomically persist approval, durable audit evidence and idempotency result. Use server-authenticated actor attribution and database-generated time. Approval does not increment the planning revision or change existing downstream references.

Enforce one approval per tenant/project/revision and immutable update/delete triggers. Add the composite tenant/revision uniqueness needed for an authoritative foreign key to existing revision rows; prevent approval history disappearing through deletion cascades. Add database closure guards for the new table, serialized with project closure. Concurrent distinct approvers must converge on the existing approval, retaining the first committed approver; concurrent save/close must produce a clear conflict rather than approve a different revision.

Persist scoped idempotency key, request hash and result atomically. Same key/same request returns the committed result after fresh authorization, even if the project later changes or closes; same key/different request conflicts. An old result is readback, never a new mutation or approval of a newer revision. On timeout, query/replay that key; if the transaction rolled back, retry against the original expected revision. Never use client optimistic success. Faults must roll back snapshot/audit/key together, eliminating partial approval recovery writes.

### Domain invariants and compatibility

Preserve [Prastuti rules](../25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md): one Science common crate per grade SET; one universal crate per explicitly entered complete Science 8+9+10 set; never infer complete sets from minimum grade counts. Mathematics remains independently selected and receives no Science common/universal crates. Preserve per-school packing before aggregation, explicit overrides/reasons, and educational-versus-physical material semantics from the [quantity specification](../04_QUANTITY_ENGINE_SPEC.md).

Leave published Kits, their approval provenance, saved planning revisions and downstream demand references valid and unchanged. Do not backfill requirement approval, invent historical actors/times, or reinterpret saving as approval. Projects begin without a new requirement-approval attestation until explicitly approved under the new contract. No new execution gate or operational writes are part of 13M-A. Existing API payloads remain compatible through additive fields/read endpoints.

Migration must add constraints and immutable/closure triggers without rewriting old history or seeding approvals. Test populated upgrades and foreign-key compatibility. Prefer feature disable as rollback; destructive down migration must refuse populated approval/audit history. A future calculator version must not silently recalculate or reinterpret old attestations.

### Minimal later Precision Operations integration

After backend acceptance, expose a permission-gated action against the displayed saved revision, show all-school scope, and confirm its revision/counts before submission. Distinguish Save, Kit publication and requirement approval. Refresh durable approval state after success/timeout; display historical/stale approvals and actor/time; block closed/archived or unsaved approval attempts. Retain workspace opt-in and flag-off legacy behavior. No UI write integration is authorized by this report.

## 5. Required implementation tests

1. Anonymous, inactive, viewer, forged JWT role and missing capability denial; tenant isolation on mutation, detail/history and idempotency lookup.
2. Missing/archived/closed project, unsaved/stale revision, foreign or unapproved Kit/material, invalid sets/overrides and agreed material/UOM policy; Science/Math independence and physical demand semantics.
3. Two approvers, save versus approval and close versus approval races; exact same-key retry, changed-payload conflict and historical replay after edit/closure.
4. Inject failure before/after snapshot/audit/key persistence; transaction rollback; timeout after commit and process/database restart recovery through readback.
5. Direct SQL update/delete denial, tenant composite foreign keys, first actor/time preservation, immutable conversion/calculator provenance and current-versus-stale derivation.
6. Archive/history retention, populated migration/rollback refusal and compatibility with existing Kit approvals, saved revisions and downstream demand references.
7. Fingerprint business tables to prove approval writes only its approval/audit/idempotency records: no stock, reservations, procurement, production or packing changes.

## 6. Verification performed

Current targeted checks: **44 tests passed** across four files, in two successful runs:

- `src/routes/__tests__/projectPlanning.integration.test.ts`: 14 PostgreSQL integration tests. Covers actual Kit approval creation/idempotence, immutable snapshots/triggers, save concurrency, tenant/role isolation, restart persistence and requirement-approval denial. At line 209, workspace approve attempts return 401/403/405 as appropriate; unsupported nonworkspace approval returns 404; retries/concurrent attempts leave every schema table fingerprint unchanged.
- `src/features/projects/__tests__/{requirementPlanning,requirementReview,projectsWorkspace}.test.ts`: 30 tests for quantity rules, saved-revision comparisons and workspace behavior.

Command: `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run <the files above> --reporter=dot`, with `NODE_ENV=test` and workspace-local TEMP/TMP. Initial default-temp startup failed with EPERM; local temp fixed startup. Restricted loopback then denied integration database access (EACCES); the authorized elevated integration rerun passed. The integration guard requires `127.0.0.1:55432/experimind_kitbuilder_test` and creates a unique synthetic schema; it retains that schema. No company data was modified. No runtime changes, browser tests, build or full regression were needed. Prior 13L full-suite results remain historical evidence only.

## 7. Decisions requiring user authorization

- Accept complete-project revision approval, or require independently approvable schools (which needs a broader revision/concurrency design).
- Name approver roles/capability and decide whether a drafter may approve their own requirements.
- Define readiness blockers for missing/ambiguous material/UOM mappings, empty schools and other incomplete demand; stock shortage alone is proposed informational.
- Accept approval as attestation initially, or separately authorize an execution eligibility gate and treatment of existing in-flight work.
- Authorize 13M-A and its additive migration. Revocation/rejection, independent school approvals, retrospective attestation and UI mutation integration need separate scope decisions.

Stop for review. No approval mutation, migration, deployment or main merge was implemented.
