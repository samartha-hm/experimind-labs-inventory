# Milestone 13I — inspection contracts (audited before implementation)

Authoritative source: `routes/v1/packing.ts`, `services/PackingService.ts`,
`features/packing/packingTypes.ts`; 13H acceptance and 13G write proposal.
Every request reloads an active actor in the explicit JWT organization. Package
ownership is resolved through the tenant-scoped order, never a scanned tenant ID.

| Action / source endpoint under `/api/v1/packing` | Actor and transition | Revision / duplicates | Evidence and effects | Recovery / integration |
| --- | --- | --- | --- | --- |
| GET `/workspace/orders/:id`, `/workspace/packages/:id` | Packing reader or viewer; tenant scoped; no transition | Current order revision; no mutation | Immutable requirements, six checks, open/corrected exceptions, inspector UUID/time and latest 100 snapshot events | Reload/scan; supported |
| POST `/orders/:id/qc`, reject | Active admin, super_admin, manager, inventory_staff; packing order, assembled package, QC pending/rejected → rejected; accepted target forbidden | Expected order revision under row lock; organization/key advisory lock; actor + exact payload hash replay, mismatch 409 | Six explicit booleans, reason, checked_by/time; atomic SupplyEvent snapshot and SupplyOperation; resets ancestor assembly/QC; no picks, stock, reservations or readiness writes for rejection | Integrate one-package rejection through execution-flag adapter `/workspace/orders/:id/inspection-rejection`; require reason; additionally protect accepted ancestors under the same row lock. Preserve exact key/body after ambiguous response; stale 409 requires explicit reconciliation |
| POST `/orders/:id/qc`, accept | Same inspector roles; assembled, all six pass, children accepted, exceptions resolved → accepted; can automatically change order to ready | Same locking/replay | Snapshot evidence; implicit dispatch-readiness state change | **Blocked** in Precision Operations: readiness is outside this authorization. `/workspace/.../qc` remains 405; rejection adapter refuses accept |
| Partial check save / needs-attention | No existing persisted partial inspection contract | None | No independently versioned inspection draft | Read-only needs-attention presentation; unsubmitted controls are not inspection evidence |
| Packing correction / reassembly | Existing 13H writer permissions; unaccepted package/ancestors only; correction resets progress | Existing revision/key guarantees | Durable exception correction, assembly and snapshot evidence; no QC approval | Existing 13H actions retained; after supported correction/reassembly, an authorized inspector may reject again. No implicit acceptance |
| Reopen accepted package / order | Legacy supervisor reopen changes workflow | Outside bounded integration | Can invalidate accepted tree | Disabled; reviewed rework contract required |
| Legacy QMS, RMA, signatures | Separate blocked routes; not packing inspection authority | Not applicable | No invocation, new route or bypass | Remain blocked; no signature or independent approval identity invented |
| Dispatch, picking, reservations, substitutions, requirement edits | Outside integration | Not applicable | Potential operational mutations | No workspace action |

Audit limitations: history is the latest 100 order snapshots, not a complete
immutable inspection-attempt API. Display snapshots as snapshots, including their
event actor separately from the recorded inspector. Existing roles permit an
inspector to inspect their own packing; no separation-of-duties policy is invented.
Package and approved project/kit requirements are not changed by inspection.
Session-storage recovery lasts only for that browser session; after storage loss,
review server history before creating a new intent. No automatic retry with a new
key, compensation, stock mutation or success before confirmed persistence/reload.
