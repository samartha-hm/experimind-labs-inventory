# Milestone 13M-B — independent approval backend review

Date: 2026-10-18. Branch: `feature/kit-builder-milestone-1`.
Reviewed baseline: `82ce64c921eed142579a0b00b406f819a55dd15f`.

## Decision: CONDITIONAL PASS

The baseline contained a blocking packing demand bypass, reproduced through HTTP.
The additive migration in this checkpoint closes it, with HTTP, direct-service and
SQL regression coverage. Modern approval UI integration may be proposed for new,
current saved requirements after this checkpoint is accepted and migration 14 is
installed. This review does not authorize UI implementation or operational rollout.
Historical/superseded work remains blocked pending a separately authorized policy.
Approval is demand attestation, not a cumulative purchasing/production budget.

## Exact contract independently reviewed

`POST /api/v1/planning-projects/:id/requirement-approvals` accepts only a positive
integer `revision` and a trimmed, nonempty `key` of at most 100 characters. Active
tenant `admin`/`super_admin` authority is read from the database inside the
transaction; JWT role claims alone cannot grant approval. Admin self-approval is
permitted and attributed. Staff, editors, managers and viewers cannot approve.
`GET` on the same path returns retained approvals to authorized tenant readers.

Approval requires the current open, nonarchived saved project revision, schools
with selections and positive physical demand, tenant-owned published Kit versions,
valid quantities and resolved units. Empty/zero-demand schools fail. Stock
verification and shortages do not determine approval readiness. The immutable
snapshot retains saved content, school/selection/Kit version identities, demand
lines, conversions, packing references and gross material demand. It excludes live
stock balances. SHA-256 covers canonical JSON: sorted object keys, preserved array
order. Actor, tenant, revision and database timestamp are retained immutably.

The project row lock serializes save, approval and consequential execution. Unique
tenant/project/revision evidence prevents duplicate snapshots; tenant/actor/key
advisory locking and durable retry rows prevent duplicate/conflicting retries.
Different keys converge on the first approval. Identical committed retry returns
the original evidence even after supersession, after current actor authorization
is checked; it does not authorize execution. A conflicting key returns 409.

POST returns 201 including retries; unauthenticated 401, forbidden 403, absent or
foreign project 404, malformed/readiness 400, stale/closed/conflicting 409. Database
constraint failures are mapped to generic 409 responses without SQL details.
Approval itself creates approval/retry evidence only, with no stock or operational
mutation. A later save preserves the approval snapshot and supersedes execution
eligibility. There is no partial approval, delegation, revocation or override.

## Consequential endpoint coverage matrix

Paths below are relative to the stated `/api/v1/` prefix. Braces enumerate every
member. All mutation handlers were traced into their service and database write;
the focused suite exercises representative adversarial HTTP paths and shared
database barriers, rather than every transition/status Cartesian combination.

`R`: current open project + exact tenant/project/school/revision approval binding;
insert derives approval on the server, update preserves and rechecks the binding.
`P`: project-linked purchase lines bind to immutable request-line evidence; PO and
receipt inherit and revalidate every linked line. `C`: child/ledger write checks
its authoritative parent/source binding. Requesting an approval ID is not the
execution API contract: omitted IDs are safe because the server resolves them;
forged extra fields fail DTO validation. Record revision CAS is also enforced.

| Prefix | Method and endpoint(s) | Exact approval barrier / binding |
| --- | --- | --- |
| supply-planning | POST `reservations` | R; binding created atomically with reservation |
| supply-planning | POST `reservations/:id/{adjust,release,cancel,fulfill}` | R on existing reservation; fulfillment ledger C |
| supply-planning | POST `requests`; PUT `requests/:id`; POST `requests/from-shortage` | P; server stamps approval ID/revision into response/audit; linked scope edits rejected; shortage basis must belong to snapshot |
| supply-planning | POST `requests/:id/{review,approve,cancel}` | P on every project-linked line, including cancellation |
| supply-planning | POST `orders`; POST `orders/:id/{review,approve,cancel}` | P inherited from source request; linked scope immutable |
| supply-planning | POST `orders/:id/receipts`; POST `receipts/:id/{accept,reject,quarantine}` | P from parent PO; accepted physical movement C |
| production-planning | POST `orders` | R; individual school/item/unit planned quantity cannot exceed approved demand |
| production-planning | POST `orders/:id/assign`; POST `orders/:id/{release,reserve,start,complete,cancel}` | R; input allocations C |
| production-planning | POST `orders/:id/{issues,output,qc}` | R; issue/batch/QC children C; physical issue/output ledger C |
| packing | POST `orders` | R; snapshot demand lines equal approved school lines; migration 14 rejects project demand changes |
| packing | POST `orders/:id/{release,pause,resume,cancel,reopen,assign}` | R on immutable project/school/demand identity |
| packing | POST `orders/:id/{picks,checklist,qc,exceptions}` | R; picks C; verified consumption ledger C |
| packing | POST `orders/:id/changes` | R plus migration 14: project additions/substitutions rejected; manual make-for-stock behavior retained |
| packing | POST `workspace/orders/:id/{inspection-rejection,checklist,exceptions}` | Same service/table R/C; workspace flag/permission checks are additional gates |
| delivery | POST `orders` | R and exact approved packing-parent identity; package claims C |
| delivery | POST `orders/:id/{dispatch,transit,fail,return,retry,receive,issues}` | R; custody children C; receipt cannot bypass the source binding |
| delivery | POST `installations`; POST `installations/:id` actions `check,note,assign,issue,correct,finish,accept,reopen` | R plus school delivery-source approval reconciliation |
| delivery | POST `projects/:id/completion`, actions `close,reopen` | Exact current project revision and R; packing/delivery/installation/production/reservation/procurement sources must reconcile to that approval; exception text cannot waive it |
| legacy aliases | Mutations under `/api[/v1]/{projects,production,stickers,qc,traceability}` | Existing authenticated fail-closed 503 gate precedes legacy mounts; all ten aliases tested |

Additional boundaries: suppliers and recipe create/edit/version/approval are master
data, not project execution. Read-only views, labels and attachment association do
not release or consume stock. Commercial purchase-order routes whitelist commercial
DTO fields and cannot create/rebind project planning lines. Their legacy receipt
service uses a transaction and unverified ledger semantics; the existing verified
inventory/ledger guards reject changes to physical truth. It is not an alternate
verified project receipt path. Standalone make-for-stock records lack project
identity by design; immutable root identities prevent later attachment as approved
project execution. Direct service writes still encounter R/P/C database guards.

## Prioritized findings

1. **P1 — fixed: approved packing demand could be changed after approval.**
   `PackingService.change` stored additions/substitutions in `execution.changes`;
   `actualMaterials` uses those changes for picking. Migration 13 checked original
   `snapshot.lines` on creation but did not reject effective demand changes during
   updates. A valid admin HTTP request added 9 m to a 2.4 m approved school order
   and returned 200. This was a consequential bypass, regardless of current stock.
   Migration `1792454400014-HardenApprovedPackingDemand` rejects nonempty changes
   on project-linked packing INSERT/UPDATE. No historical row is rewritten. A
   revised demand needs a newly saved/approved revision; replacement/reconciliation
   of existing allocations is still subject to the historical policy below.
   Final HTTP addition/substitution attempts return 409; direct service and SQL
   attempts fail atomically with unchanged business fingerprints.
2. **Operational restriction — unresolved business policy, not waived.**
   Historical records have no fabricated binding; superseded records retain their
   original identity but fail current-revision checks. This also blocks cleanup,
   cancellation and reopening transitions. A new approval does not migrate old
   allocations. Explicit business authorization is needed before reconciling them.
3. **Scope limit — cumulative budget policy remains undecided.**
   Existing approval attests demand and guards revision identity. It does not
   establish an aggregate purchase/production budget across multiple records.
   Individual production demand and existing stock/quantity controls still apply.
   UI copy must not represent this approval as a cumulative spending allocation.

No other unguarded project execution entry point was identified in the traced
route/service/table inventory. Coverage does not constitute proof for arbitrary
privileged SQL, disabled triggers or future routes/migrations.

## Adversarial tests and quantity evidence

Focused test: `src/routes/__tests__/requirementApproval.integration.test.ts`;
real HTTP servers and PostgreSQL, isolated randomly named schema, synthetic users,
schools and inventory. Guard refuses databases other than
`127.0.0.1:55432/experimind_kitbuilder_test`. No mocks substitute for transaction
or trigger enforcement. Twenty focused tests cover:

- Missing approval; wrong project/school; foreign tenant; forged approval fields;
  missing authentication; editor/viewer rejection; empty and zero-demand schools.
- Admin self-approval attribution; disabled/demoted actor denial even with old JWT
  or committed retry; immutable approval/binding evidence and populated rollback.
- Simultaneous same/different-key approvals converging to one snapshot; concurrent
  same-key conflicting projects yielding exactly one 201/one 409; lost-response
  retry simulated by resubmitting a committed request and obtaining identical ID.
- Save/approval race produces either old immutable evidence or a stale conflict;
  old execution fails either way. Approval/packing race produces a correctly bound
  order or a safe 409 followed by a correctly bound retry.
- Injected retry-table failure rolls back approval and retry evidence. Injected
  packing audit failure rolls back order, binding, operation retry and audit;
  subsequent retry creates one order and one audit. Generic 409 is expected for
  these simulated PostgreSQL exceptions; rollback is asserted independently.
- Historical completion fails even with an exception reason; superseded operational
  mutations fail; complete approved packing/delivery/installation/closure lifecycle
  and production allocation/output/QC operate against retained approval identity.
- Packing addition/substitution HTTP, alternate direct service, SQL update and
  all ten legacy route aliases fail closed.

Baseline physical wire demand: School A Science G8/G9/G10 each 2 sets gives
`3 × 2 × 0.1 = 0.6 m` activity material, `3 × 2 × 0.2 = 1.2 m` grade-common
material and explicit 2 complete G8–10 sets `2 × 0.3 = 0.6 m` universal material:
2.4 m. School B G8=3, explicit universal=0: `0.3 + 0.6 = 0.9 m`; total 3.3 m.
Two pouch mappings reference the same activity/material and add no second demand.

Independent variant: School A explicit universal=0 despite full grade selections,
plus Mathematics G8=1 adds 0.4 m: `0.6 + 1.2 + 0 + 0.4 = 2.2 m`; School B
remains 0.9 m. Assertions sum inventory material in metres, separately from crate
count lines. Publishing a later Kit with changed material quantity leaves the
saved project's pinned version and approved demand unchanged.

Unverified stock reports `null`, not zero, and can be approved. A separately
reviewed/approved physical count of zero changes live preview to verified zero;
approval retry still returns identical evidence with no further stock mutation.

## Fingerprints, history and verification

[Machine-readable evidence](MILESTONE_13M_B_FINGERPRINTS.json) retains schema,
approval identity/hash, concurrent results, quantity reconciliation and before/after
count + sorted-row MD5 fingerprints for 22 business/physical/audit tables. MD5 is
an equality aid, not the approval integrity hash (SHA-256). Approval and retry
tables are deliberately separate from those business fingerprints; tests assert
their legitimate row counts and uniqueness. Execution bindings and operation
retry tables are compared separately during rollback tests.

Migration up/down/up preserves all 22 historical/business fingerprints and does
not backfill approval/binding evidence. Approval preserves all 22 fingerprints.
Rejected demand changes preserve all 22. Approval failure preserves all 22 and
leaves no approval/retry. Packing failure preserves all 22 plus exact binding and
operation rows. Explicit stocktake and successful lifecycle actions are legitimate
physical/audit changes, distinguished from approval effects in the evidence.
Legacy inventory quantities remain unchanged by the approved lifecycle.

Verification completed on 2026-10-18: all 20 focused PostgreSQL tests passed;
the full suite passed all 566 tests in 76 files (46.26 seconds). Typecheck and
frontend/PWA/server builds passed. The frontend build emitted a chunk-size
warning. No tests were skipped. The committed fingerprint artifact comes from
the passing focused run; the full regression run did not overwrite it.

The local PostgreSQL initially required recovery after restart; an early attempt
failed with connection refusal before tests could execute. Recovery completed and
subsequent isolated runs passed. Exploratory red tests exposed the packing bypass;
test authoring also corrected expected generic database-conflict responses,
separated crate counts from material units and used the actual Kit draft revision.
These corrections did not remove rollback, quantity or bypass assertions.

## Required decisions before operational adoption

- Authorize reconciliation of historical/superseded allocations: permitted actors,
  explicit evidence, stock/custody treatment, replacement/cancellation and audit.
- Decide whether procurement/production need cumulative demand budgets; define
  reservation, replenishment, scrap and extra-usage policy before implementing one.
- Accept this backend checkpoint and separately scope modern approval UI work;
  present current versus retained approval accurately and offer no override.

No approval UI, main merge, deployment or production-data change is included.
