# Future Packing/QC integration — proposal only

13G implements none of these writes. Obtain separate review and authorization
before integrating them; retain the read-only flag independently of write rollout.

## Existing mutation boundary

All endpoints below are POST `/api/v1/packing/orders/:id/...`, except order
creation POST `/api/v1/packing/orders`. They use PackingService, authenticated
active tenant membership, strict DTOs and Idempotency-Key. Existing broad writer
roles are admin, super_admin, manager, staff, inventory_staff, production_staff,
project_staff and editor; viewer cannot write. Do not infer permissions from
assignment, client JWT claims or visible UI controls.

| Endpoint | Additional authoritative checks / effect |
|---|---|
| release / pause / resume / cancel / reopen | Revision/status guards; release requires admin/super_admin/manager and current planning requirement validation; preserve existing transition rules |
| assign | Active same-tenant employee; finalized orders immutable |
| picks | Active packing, canonical units, approved demand limit, verified ledger/free stock and matching reservation locks; writes stock ledger and reservation transfer |
| checklist | Active packing; picks sufficient, children assembled first, unresolved exceptions block; assembly resets QC/ancestors |
| qc | admin/super_admin/manager/inventory_staff; six boolean checks, all pass to accept; assembled/children accepted/no open exceptions; accepted order becomes ready only under existing complete-tree rules |
| exceptions | Active packing; report/correct existing exception with actor/time; retain full evidence and ancestor resets |
| changes | admin/super_admin/manager; canonical stock units, reason; substitution guards against original already issued; resets package/ancestor progress |

## Required design before writes

1. Fetch latest order revision before presenting confirmation. Mutation service
   locks order FOR UPDATE and rejects mismatched revision with 409; never silently
   replay against a newer revision. Show server state and preserve unsent inspection
   separately for operator reconciliation. Read-only package lookup does not carry
   an order revision; derive it from refreshed detail.
2. One stable idempotency key per explicit user intent. Existing SupplyOperation
   transaction/advisory lock fingerprints actor + payload, replays identical
   requests and rejects mismatches. New key for every scanner repeat would permit
   duplicate intent: debounce alone is insufficient. Scan identifies package;
   acceptance must require explicit evidence and confirmation.
3. Keep picks and stock-affecting actions behind a distinct reviewed boundary.
   Never update inventory balances from UI or treat assembled/QC as new picking.
   Cover concurrent reservations, canonical quantities, shortages, stale revision,
   replay after timeout, ancestor resets and order-ready behavior with PostgreSQL
   tests and complete operational-state reconciliation.
4. Rejection/rework/reinspection needs immutable inspection-attempt presentation.
   Current progress stores latest booleans/notes/reviewer; SupplyEvent snapshots
   preserve order revisions but no dedicated inspection-attempt API or package
   evidence attachment contract exists. Decide mandatory rejection reason,
   correction provenance, actor separation and audit retention explicitly.
5. Define a server capability response for each permitted action/state; current
   role availability alone is insufficient. Resolve whether packer may review own
   work, and whether assignment restricts action. Neither new restriction should
   be invented in the frontend.

## Contract gaps and rollout

Missing: scan-event/deduplication identity, physical device provenance, per-material
package completion, inspection photo/attachment linkage, inspection-attempt history,
reviewer separation policy, capability matrix, and paginated order/history APIs.
Demand revision here is frozen context; define explicit stale-requirement guidance.
No dispatch integration or printer success should be inferred from labels.

Proposed rollout: development synthetic rehearsal → authenticated write sandbox
with independent default-off organization flag → operator/reviewer and physical
tablet/scanner/printer signoff → separately authorized limited pilot. Rollback
disables new writes and returns legacy workflow, while retaining all audit/ledger
records. Already committed stock transactions require existing reviewed corrective
operations, never database deletion or automatic rollback. Main merge, deployment,
company-data use and production inventory changes require separate authorization.
