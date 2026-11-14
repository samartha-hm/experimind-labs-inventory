# Milestone 13H — supported packing contracts

Scope: existing PackingService persistence, with guarded adapters under
`/api/v1/packing/workspace`. No new packing calculation, stock movement, schema,
QC workflow, or approved requirement modification. Legacy Packing/QC stays default.

## Authorization and transaction boundaries

Every request authenticates a bearer token and reloads the active database user
in its explicit organization. Current writer roles are admin, super_admin,
manager, staff, inventory_staff, production_staff, project_staff and editor.
Viewer may read. Assignment is context, not authorization. Order/package reads
and all writes scope to organization; foreign identities return 404.

Every write requires Idempotency-Key and a validated expected order revision.
PackingService serializes the organization/key with a transaction advisory lock,
binds actor and request fingerprint, and stores the successful response atomically.
Same actor/key/body replays without another mutation, including after a lost
response; changed actor/body conflicts. Order FOR UPDATE plus expected revision
rejects concurrent stale intents with 409. Failed transactions store no success.

| Action / endpoint suffix | Actor | Mutation | Version / idempotency | Evidence | Recovery |
| --- | --- | --- | --- | --- | --- |
| GET workspace/orders, orders/:id, packages/:id | Writer or viewer | None; identity selection only | Current server snapshot; no write key | Existing immutable snapshot, order revision, actor history and package provenance | Reload; unknown scan retains selected package; unauthorized context clears |
| GET workspace/orders/:id/capabilities | Writer or viewer | None; fail-closed action blockers | Revision paired with detail, rechecked before review | Current-role, lifecycle and accepted-ancestry protection | Refresh if missing or mismatched |
| POST workspace/orders/:id/checklist | Writer | Exactly one package assembled true/false, operator notes and actor/time; resets ancestor assembly/QC and package QC to pending | Required revision; atomic key replay above | One SupplyEvent snapshot and revision, packed_by/at/notes | Identical pending retry; stale/denied intent requires explicit reconciliation; reset is a new audited action, not deletion |
| POST workspace/orders/:id/exceptions | Writer | Report missing/damaged/other; or correct an existing open exception with reason; resets package and ancestors | Required revision; atomic key replay above | Original report retained; correction actor/time/reason; one SupplyEvent snapshot | Retry same key after uncertainty; never invent completion; correct only through existing correction API |

Both write adapters require nonblank evidence, execution flag, active packing,
and reject accepted target or ancestor while holding the order revision lock.
Checklist assembly retains existing child-completion, unresolved-exception and
picked-allocation validation. Adapters reuse the existing service transaction;
legacy behavior remains separate. No action automatically approves inspection.

## Blocked contracts and transitions

| Action | Disposition / blocker |
| --- | --- |
| Measured per-material actual packed quantities | Read-only: no existing audited, versioned measured-quantity write contract. Required, picked, assembled allocation and QC passed values remain distinct; allocation is not a measured count. |
| Individual checklist criteria / acknowledgment record | No separate persistent criteria/acknowledgment contract. Existing package boolean and notes only; explicit UI identity/reset acknowledgment gates submission but is not represented as backend inspection evidence. |
| Accepted package/ancestor rework; ready/paused/cancelled/reopened lifecycle | Blocked in integration. Existing legacy exception/checklist can reset accepted evidence; reviewed rework authorization is outside this scope. |
| Picking / reservations / substitutions / additional material / stock adjustments | No workspace route. These affect inventory or requirements and need separate operational review. |
| QC approve/reject, dispatch-ready, dispatch, assignment, release/reopen/cancel | No workspace route. Existing role sets and backend lifecycle do not authorize their integration in this milestone. |
| Approved kit/project edits, tenant changes or QR-driven writes | Unavailable. Scanner only resolves server-authorized identity. |

## UI, flags and rollback

`PACKING_WORKSPACE_READ_ONLY=true`, exact comma-separated organization allowlist
`PACKING_WORKSPACE_ORGANIZATIONS`, and development/test NODE_ENV retain the 13G
workspace gate. Additional `PACKING_WORKSPACE_EXECUTION=true` enables only these
two adapters. All flags default off; production remains off. Explicit workspace
toggle or `/?packing_workspace=1` is still required.

Pending intent (actor, package/order identity, expected revision, key, exact body)
is stored in that actor's sessionStorage before transmission. Browser reload
offers identical retry or explicit release/reconciliation; release does not undo
a server commit. An immediate in-flight guard prevents duplicate button writes.
Success is displayed only after server response; completion feedback additionally
requires authoritative reload. Cross-tab storage notification reloads idle tabs;
busy tabs still rely on server revision locking and preparation revalidation.
Network/5xx retain retry; 4xx require review. A closed browser session, cleared
storage or different device requires reviewing server history before a new intent.

Disable execution for read-only workspace; disable the workspace flag for legacy
Packing/QC. Saved records use existing schema and remain readable in legacy.
No migration, data rewrite, or stock compensation is required to revert the UI.
