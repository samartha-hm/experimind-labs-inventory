# Milestone 13M-A backend contract

Status: backend implemented for separate review; no approval UI or deployment.

## Approval

Approval covers one saved project revision and every school in its immutable
revision content. Active tenant `admin` and `super_admin` users may approve,
including their own work (explicit user authorization, 2026-10-18). Editors,
staff and managers cannot approve. There is no delegation, partial approval,
revocation or override. Saving later content supersedes execution eligibility,
without changing prior approval evidence.

`POST /api/v1/planning-projects/:id/requirement-approvals` accepts only
`revision` (positive integer) and `key` (1–100 characters). The tenant and actor
come from authentication and are revalidated inside the transaction.
`GET /api/v1/planning-projects/:id/requirement-approvals` returns retained
approvals, newest first. Responses include approval identity, source revision,
snapshot hash, approver and database time. Retry keys are scoped to tenant and
actor; a committed identical retry returns the original approval even after a
later save. Reusing a key for another request conflicts. Concurrent different
keys converge on the first approval of a revision.

Readiness requires an open, active, current saved revision, at least one school,
nonempty selections and positive physical demand at every school, published
tenant-owned immutable Kit versions, valid quantities and unambiguous material
units. Missing stock verification and shortages do not prevent approval.
The snapshot contains saved content, expanded per-school demand, packing
references and conversion provenance; live stock is excluded. Approval has no
inventory, reservation, procurement, production or custody side effects.

## Execution boundary and compatibility

Shared PostgreSQL trigger enforcement runs in the authoritative mutation
transaction and locks the same project row as save/approval/closure. It binds
each new project-scoped operational record to an exact approval identity and
source revision, preserving that binding on later transitions. Existing
historical records receive no fabricated binding. Consequential transitions
without a binding remain blocked pending explicit reconciliation policy;
read-only access remains available. Unrelated make-for-stock operations remain
independent. Old idempotent operation results are readback, not new execution.

Mutation inventory traced:

| Service | Entry points requiring enforcement |
| --- | --- |
| SupplyPlanningService | reserve; reservation adjust/fulfill; linked request create/edit/from-shortage/review/approve/order; order review/approve; receipt create/inspection acceptance |
| ProductionPlanningService | project work-order create/assign/release/reserve/start/complete; input issue; output report; QC; input allocation/batch child writes |
| PackingService | project order create/release/pause/resume/reopen/assign; pick/check/QC/exception/change; workspace aliases |
| DeliveryService | create from packing; dispatch/transit/fail/return/retry; receive/issues; custody/package claims |
| ProjectCompletionService | installation creation/actions/acceptance; project close/reopen; exception reasons cannot bypass requirement approval |
| Legacy operational routers | projects, production, stickers, QC and traceability aliases retain the existing 503 fail-closed gate |

The additive migration installs `requirement_execution` on root operational
tables and production allocation/issue/batch/QC, packing picks, delivery claims
and custody children. Procurement checks every linked JSON line; request lines
receive immutable approval identity and revision in both responses and audits.
Stock-ledger insertion checks the reservation, receipt, production or packing
source before accepting a movement. Workspace aliases use the same tables.
`requirement_execution_bindings` retains the exact tenant/project/school/revision
and approval ID for each root or purchase-request line. Read it by
`(kind, record_id, organization_id)`; bindings cannot be reassigned or deleted.

Installation checks its delivery sources; completion checks delivery, packing,
installation, production, reservation and procurement sources. Exception reasons
cannot bypass missing or different approval bindings. Reopening is allowed only
with the same current approval. Project-linked procurement line changes require
a replacement request. Historical and superseded execution remains readable;
its next transition is blocked until a separately authorized reconciliation
policy exists. There is no automatic migration of in-flight allocations.

The snapshot hash is SHA-256 of recursively sorted JSON object keys, preserving
array order and JSON serialization semantics. `approved_at` is database-generated;
the immutable approval row is the attributable approval audit. Durable retry rows
record each tenant/actor/key mapping. `POST` returns 201, including retries;
invalid readiness/input returns 400, permission 403, absent tenant project 404,
stale/closed/archived or conflicting evidence 409, and unauthenticated access 401.
GET is available to existing tenant planning readers, including viewers.

Approval is an attestation of demand, not a stock or budget allocation. Existing
quantity/stock controls still apply. Packing lines must equal approved school
lines; production creation must fit the approved school/item/unit demand.
No frontend workflow or feature flag changes are included. See
[acceptance evidence](MILESTONE_13M_A_ACCEPTANCE.md).

## Migration and recovery

Use an additive migration, retain all historical records, and prohibit editing
or deleting approval, retry and binding evidence. Empty rollback is permitted;
populated rollback must refuse removal of evidence. Recovery with retained
evidence uses a forward migration or application repair, never evidence deletion.
