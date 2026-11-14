# Milestone 13M-C — cumulative demand and historical reconciliation

Date: 2026-10-18. Branch: `feature/kit-builder-milestone-1`.
Verified starting local and origin branch HEAD:
`cc3d0c6be17cd1e7e580c4f5205a442981a875f1`.

Status: **proposal for user review; implementation and operational use not authorized**.
No application code, schema, approval, company or operational records changed.

## 1. Evidence and existing semantics

These are static code findings at the baseline. The [13M-B review](MILESTONE_13M_B_INDEPENDENT_REVIEW.md)
contains prior HTTP/PostgreSQL evidence; its test results were not rerun here.

| Inspected source | Finding and limit |
| --- | --- |
| [RequirementApprovalService](../../../src/services/RequirementApprovalService.ts), `approve` | Active tenant admin/super_admin can self-approve with attribution. Project lock, immutable saved revision snapshot/hash, durable retry; stock excluded. Approval does not allocate cumulative capacity. |
| [Migration 13](../../../src/migration/1792368000013-AddRequirementApproval.ts), assertion/root/child/supply guards | Exact tenant/project/site/revision bindings, immutable originals; historical/stale mutations blocked. PR/PO/receipt sources propagate approval identity. |
| [Migration 14](../../../src/migration/1792454400014-HardenApprovedPackingDemand.ts) | Project packing additions/substitutions rejected, including direct SQL. Preserve this barrier. |
| [Supply entities](../../../src/entity/SupplyPlanning.ts), [SupplyPlanningService](../../../src/services/SupplyPlanningService.ts) | Reservations track active/released/cancelled/fulfilled quantities and fulfillment ledger/location. Purchase lines retain canonical units/conversion provenance and IDs. Capacity checks concern physical availability, not approved demand. |
| [SupplyStockService](../../../src/services/SupplyStockService.ts), `reservationTotals` | Active project/production input reservations and project fulfilled quantities/picks support availability. They are not a cross-stage exclusive demand ledger. |
| [ProductionPlanningService](../../../src/services/ProductionPlanningService.ts), `create`, transitions/issues/output/QC; [entities](../../../src/entity/ProductionPlanning.ts) | Each WO independently checks output against site/item demand. Recipes freeze yield/inputs/scrap; reservations, issues, batches and QC are authoritative evidence. Raw ingredients are not additional school output. |
| [PackingService](../../../src/services/PackingService.ts), `create`, `pick` | Creation materializes whole-site packing, not arbitrary partial kits. Fulfilled reservations block packing creation; reservation fulfillment blocks while active packing exists. Picks retain ledger/source movements. This avoids specific double decrements, not all duplicate commitments. |
| [DeliveryService](../../../src/services/DeliveryService.ts), creation/transitions/receipt | Manifest claims include descendants: a pouch cannot be independently claimed under its claimed box. Custody is not new material demand. |
| [physicalQuantity](../../../src/features/inventory/physicalQuantity.ts), [requirementPlanning](../../../src/features/projects/requirementPlanning.ts) | Exact four-place stock quantities, six-place conversion factors; inexact stock conversion rejected. Planning uses six-place scaled quantities. No silent precision truncation. |
| [Confirmed crate rules](../25_PRASTUTI_SET_AND_CRATE_RULES_CONFIRMED.md) | Science common per grade set, universal per explicitly confirmed complete Science set; Maths no common crate. Expand per school before aggregation. |

Existing authority is distributed among approval snapshots/bindings, purchase lineage,
reservation fulfillment, production issues/batches/QC, packing picks/source movements,
and delivery claims/custody/receipts. No inspected central record establishes exclusive
cumulative demand allocation across them. Audit snapshots and retry results are not
additional execution. Standalone make-for-stock/manual packing grants no project
authority and cannot be reattached to evade limits. No live database was inspected.

## 2. Policy assumptions and authorization boundary

Apply the proposed policies: attributed administrator self-approval; historical work
preserved and blocked until reconciled; cumulative limits; fulfilled quantity never
restored by cancellation/revision; rework grants no new school demand; revision changes
never reset accounting. These agree with the documented rules inspected.

Approval attests demand, not stock availability, supplier capacity, custody, QC fitness
or financial spend. Proposed defaults below need user acceptance. No stock correction,
loss allowance, substitution, replacement entitlement or historical approval is granted.

## 3. Recommended model: central commitment ledger

### Identities and dimensions

Use append-only events plus transactionally maintained balance projections. Proposed
tables are conceptual and require a separately authorized migration:

- Demand accounts: tenant/project/site/stable obligation ID/dimension/item/unit.
- Revision entitlements: account/immutable approval/revision/total cap plus frozen
  selection, Kit version, grade, subject, scope, conversion and demand-line provenance.
- Commitments/events: lineage root, exact quantities, source kind/ID/line, original
  approval, event actor/time/reason/key and before/after state.
- Execution claims: exclusive slices linked to authoritative PR/PO/receipt/reservation,
  WO/batch/pick/package/delivery records with parent-child lineage.
- Reconciliation cases/decisions/mappings: source hashes/revisions, evidence, actor,
  disposition, current approval and explicit continued-execution authorization.

Use tenant-scoped foreign keys and unique source attribution. Stable obligation IDs
survive revisions. A new approved revision defines a **total-to-date cap**, not an
incremental grant: 12 after 10 means total 12, not 22. Approval may be retained while
execution remains blocked pending complete mappings and valid balances.

Maintain coupled but separate dimensions:

1. Deliverable slots: school/selection/Kit version/grade/subject/set ordinal, plus
   grade-common/universal scope ordinals. Package descendants map to slots; three
   packages inside a kit do not consume three kit entitlements.
2. Canonical material accounts: school/item/unit, retaining exact attribution to
   logical demand lines and slots. Sum distinct logical requirements, not repeated
   packing references to the same activity. Shared item IDs cannot authorize using
   another Kit's allocated materials.

A root can be committed before sourcing. Later stages explicitly claim that root,
not another demand allocation. Without a root, an execution request may atomically
open only the unclaimed quantity it needs. Never automatically attach similar records
by name/item/quantity. Combined procurement/production keeps separate school slices.

### Conservation and source coverage

For each account at the current reconciled approval:

```text
A = approved total-to-date cap
F = irreversible consumption/fulfillment attributed to this obligation
H = live unconsumed exclusive commitments, including historical blocked holds
U = A - F - H
New execution requires F >= 0, H >= 0, U >= 0.
Open q:     H += q                 require 0 < q <= U
Consume q:  H -= q; F += q         require eligible held slice >= q
Release q:  H -= q                 only proven untouched, unencumbered remainder
Transfer:   change stage/source    F and H unchanged
```

Material F is charged once at irreversible project use: packing pick or historical
direct fulfillment. Receipt and accepted production output provide stock; they do
not fulfill school material demand. H survives sourcing until use or explicit release.
Deliverable F is charged once at acknowledged fulfillment of its slot. Material F
can already exist while deliverable H remains. Never sum these different dimensions.

Disjoint stock/procurement/manufacturing coverage slices may total at most their
root's open material H. PR -> PO -> receipt -> reservation -> pick transfers coverage.
On consumption, retire the consumed live coverage in the same transaction as H->F;
retain its immutable source/event lineage for audit.
Reserving the same received stock cannot add another source allocation or root.
Pending QC remains encumbered supply, not usable stock. Open supplier obligations or
started work retain their holds until settled. Manufacturing input/output stages are
linked transformations, not competing sources for the same output quantity.

Manufactured output claims school-output demand. Recipe inputs use separate frozen
per-WO resource budgets derived from claimed output/yield/explicit recipe scrap.
Raw litres and finished bottles cannot be added together. Strict proposed default:
deny input usage beyond its recipe budget. Extra loss/rework inputs need a separate,
attributed administrator-approved resource allowance, never automatic school demand.
Its authority/limits/API need human authorization; absent it, deny extra usage.

Partial execution splits a slice into exact disjoint children whose sum does not
exceed the parent. Only untouched, unencumbered remainder is releasable. Cancellation
cannot release picked/delivered quantity, issued recipe inputs, retained output,
unsettled supplier liabilities or unresolved custody. Returns/failures/retries move
the same slot; no new entitlement. Rework/resubmission preserves identity and consumed
inputs. Replacement of consumed losses requires explicit resource/loss authority.
Erroneous evidence needs an authorized compensating event referencing the original,
never deletion or an automatic F decrement. Physical returns alone restore no demand.

### Revisions, units and shared crates

Save keeps original bindings and blocks stale execution. New approval never resets
F/H. Reconciliation maps stable accounts to new entitlements, preserves old attribution
and appends a separate current authorization; original binding stays immutable.
If A < F+H, mark blocked: release only proven releasable H or obtain a legitimately
revised total. Never clamp the deficit and continue. Removed/reidentified schools,
Kits or items retain old accounts/holds; unresolved mappings block activation.
Changed versions, substitutions and ownership require explicit reviewed mappings.

Calculate from frozen approval quantities/conversions, not current catalog values.
Store original units, factor ID/value, canonical decimal and algorithm version.
Use integer arithmetic: six-place planning amounts must be divisible by 100 before
conversion to four-place stock. Reject nonrepresentable quantities/overflow; never
use floating point tolerance or per-request rounding. Kit/package counts are integers.

Science common belongs once to each grade-set ordinal. Universal belongs once to an
explicit complete-set ordinal covering Science G8/G9/G10 at that school. Partial grade
execution identifies its complete-set membership; do not infer universal crates or
`min(gradeCounts)`. Shared materials/crates are claimed once despite repeated references.
Compatible cross-school aggregation never transfers caps. Existing whole-site packing
must remain initially; partial slot selection needs a separately reviewed API/DB contract.

## 4. Alternative comparison

| Viable approach | Migration, audit and performance implications |
| --- | --- |
| Central ledger + balance projections, recommended | Explicit conservation/lineage, indexed affected-account updates, replayable revisions and historical decisions. Requires additive schema and every writer integrated; reconcile projection drift against authoritative evidence and fail closed. Historical links cannot be guessed. |
| Transactional aggregation of authoritative records | Viable only with mandatory source-allocation links, frozen revision mappings, canonical quantities and locking across every writer. Aggregate disjoint leaves, not PR+PO+receipt totals. Avoids duplicate bookkeeping but distributed JSON/status semantics complicate queries, history and auditing; indexed projections would recreate much of the ledger. |

Unlocked SUMs and individual request checks are not viable. Serializable transactions
cannot infer missing lineage. Prefer ledger for explicit historical decisions and
stage transfers. Start with project serialization and indexed account/source queries;
measure contention before finer locking. Never derive budgets from paginated list APIs.
Both options require preserved history, additive migration and fail-closed rollback.

## 5. Endpoint and transaction-boundary matrix

Paths relative to `/api/v1`. Sources: [supply routes](../../../src/routes/v1/supply-planning.ts),
[production](../../../src/routes/v1/production-planning.ts), [packing](../../../src/routes/v1/packing.ts),
[delivery](../../../src/routes/v1/delivery.ts). Effects below are proposed additions.
Every transaction includes current tenant/RBAC, exact approval or explicit reconciliation
authorization, source/CAS locks, execution, ledger/projection, audit and durable retry.
Stock/custody writes, when applicable, commit atomically with accounting.

| Endpoint/actions | Proposed boundary/effect |
| --- | --- |
| planning-projects save/archive; `:id/requirement-approvals` POST | Project lock; save blocks stale execution. Snapshot total caps, never clear F/H. Activation additionally validates mappings/capacity. No stock change. |
| supply-planning POST `reservations`; `reservations/:id/{adjust,release,cancel,fulfill}` | Open/claim exact material slices plus independent verified stock checks; edits apply delta; release untouched remainder; fulfill H->F once. Preserve packing exclusion. |
| supply-planning POST `requests`, PUT `requests/:id`, POST `requests/from-shortage` | Draft persistence holds root/source capacity. Edit delta atomically; shortage under project lock uses remaining demand and verified availability independently. |
| supply-planning `requests/:id/{review,approve,cancel}`, POST `orders`, `orders/:id/{review,approve,cancel}` | Transfer line claims PR->PO; no duplicate demand. Cancel only unencumbered remainder; live PO/receipts prevent release. |
| supply-planning `orders/:id/receipts`, `receipts/:id/{accept,reject,quarantine}` | Lock outstanding source quantity/coverage; QC changes usable/pending/rejected supply. Accepted stock separate from F; rejection never silently creates rights or duplicate pending supply. |
| production-planning POST `orders`; `orders/:id/{assign,release,reserve,start,complete,cancel}` | Draft claims output slices; stages transfer. Reserve additionally checks input budget/physical stock. Complete retains output coverage; cancel never erases issued inputs/retained output. |
| production-planning `orders/:id/{issues,output,qc}` | Issue consumes input budget/stock once; output/QC conserve batch and output caps. Reject/rework/resubmit cannot mint output rights. |
| packing POST `orders`; `orders/:id/{release,pause,resume,cancel,reopen,assign}` | Initially whole-site claims only, transfer existing source coverage where explicit. Duplicate whole-site allocation conflicts. Pause retains H; cancel untouched slices only; reopen reacquires rights, never restores F. |
| packing `orders/:id/{picks,checklist,qc,exceptions,changes}` and workspace checklist/exceptions/inspection-rejection aliases | Pick transfers reservation and H->F once with stock movement. QC/checklist change slot state; exceptions/rejection cannot release consumption. Keep additions/substitutions blocked. |
| delivery POST `orders`; `orders/:id/{dispatch,transit,fail,return,retry,receive,issues}` | Exclusive packing/descendant claims; custody transfers, no new demand. Partial acknowledgment fulfills eligible slots once; return/retry preserves fulfillment history. |
| delivery POST `installations`; `installations/:id` check/note/assign/issue/correct/finish/accept/reopen; `projects/:id/completion` close/reopen | Validate all source authorizations/quantities/custody. Never allocate again or clear F. Exceptions cannot waive deficits. |
| Proposed admin reconciliation preview/decision/apply (names TBD) | Read-only consistent preview; apply locks full graph, verifies evidence hash/revisions/current approval, appends mappings/authorization/events atomically. No generic stock override. |
| Suppliers/recipes, read-only labels/attachments, commercial-only routes and legacy aliases | No project demand grants. Preserve tenant restrictions, immutable project identity and authenticated fail-closed legacy gates. |

## 6. Concurrency and idempotency

Proposed common lock order: active actor authority, tenant/actor/key advisory lock,
projects sorted by ID, accounts sorted by key, items sorted by ID, roots/sources sorted
by kind/ID, children. Existing services have different orders (reservation item-before-row,
production order-before-item). All affected writers and migration-13 trigger project
locks must adopt one order in the reviewed implementation, avoiding late project locks
after conflicting item/source locks. No network calls in transactions. Bounded retries
for deadlocks/serialization failures retain the same key. Start with single-project writes.

Lock project, resolve approval/mappings, lock balances/sources, validate all slices,
then commit execution + events + projections + physical/audit/retry effects together.
DB guards must enforce the same contract for service/SQL paths, reject missing claims,
and constrain unique source events/ownership. Restrict projection/event writes to guarded
paths. Privileged SQL with disabled guards remains outside the 13M-B threat model.

Proposed retry scope: tenant/actor/key. Canonical fingerprint includes endpoint/action,
expected revision, approval, exact normalized quantities, source slices and decision
evidence hash. Current authorization rechecked before replay. Same committed retry
returns original result without writes; conflicting payload/actor conflicts. New keys
still hit source uniqueness and cumulative capacity. Existing operation key scopes
need explicit compatibility treatment, not silent replacement.

| Race | Required result |
| --- | --- |
| A=10/F=4/H=2, concurrent q=3 twice | U=4: first H=5/U=1; second conflicts. Never H=8. |
| Pick response lost; same key retried | One decrement, one H->F, one audit/event; retained result returned. |
| Different keys claim same source/package | Unique ownership/locks permit one; equal quantities do not prove separate rights. |
| Save versus allocation | Old allocation commits first then save blocks continuation, or save wins and allocation conflicts. No stale authorization. |
| Cancel remainder versus new claim | Capacity usable only after proven release commits; consumed/encumbered portions never free. |
| Reconciliation versus dispatch/another reviewer | Project/source CAS/hash serializes; stale plans conflict and require new preview. |
| Combined multi-project purchase | Lock all projects/accounts in sorted order, all slices commit or none; no cross-school borrowing. |

## 7. Administrator-controlled historical reconciliation

Lifecycle and reference quality are separate axes: completed orphans remain immutable
completed evidence and unresolved orphans simultaneously.

| Classification | Treatment |
| --- | --- |
| Completed, attributable evidence | Preserve original rows/bindings/times. External mapping charges F once if actually consumed; completed supply not used remains coverage/H. Completed WO/receipt does not prove delivery. |
| In-progress eligible for review | Freeze consequences; inspect partial consumption, PO/input/packing/custody obligations; explicitly decide carry-forward remainder. |
| Orphan/mismatched tenant/project/site/requirement | Quarantine; evidence-based authorized identity decision, never automatic reassignment or cross-tenant client-ID repair. |
| Superseded reference | Keep original approval/binding; map compatible F/H to current approved total and append authorization overlay. |
| Manual decision required | Duplicate lineage, consumed cancellations, unknown units, version changes, shortages/loss/replacements, missing recipients/custody or insufficient cap remain blocked. |

Procedure for later implementation:

1. Tenant-scoped read-only export of the complete graph, including completed/cancelled
   records, revisions, approval hashes, ledger/custody, conversion provenance and evidence
   hash. No inference from status alone.
2. Dry-run plan classifies each source; distinguish material F/H, deliverable slots,
   source coverage and recipe input consumption. Unknown consumption is unresolved,
   never zero. Link only proven lineage; fabricate/backdate no approval.
3. Active administrator records retain/freeze/map/cancel-untouched/settle-external
   decisions with reason/evidence references. Attributed self-review allowed unless a
   subsequently approved policy requires two people. No blanket override/bulk accept.
   Stock/custody corrections require separate authority and immutable movements.
4. Continuation requires current saved approved requirements and complete accepted
   reconciliation into total caps. Existing exact current approval may be used after
   review; otherwise save/approve a new revision. Historical/superseded approval is
   never fabricated. Completed-only archival mappings grant no execution rights.
5. Apply under current admin authorization and graph locks; recheck hashes/CAS, caps,
   uniqueness and exact units. Append decision/import events/projection/authorization
   atomically once. Failure changes nothing; no partial activation or binding rewrite.
6. Independently reconcile totals against physical/custody evidence, retain export/audit
   and unresolved cases. Only authorized reconciled sources resume; closure requires
   no unresolved blocking sources or holds.

Automatic reconciliation is unsafe for missing/deleted/foreign references, reused
names/regenerated IDs, overlapping orders, absent movements/purchase links, fulfilled
reservations alongside picks, unexplained negative balances, consumed cancellations,
disputed receipts, unknown/changed conversions or precision, changed Kits/BOM/recipes,
unconfirmed completeScienceSets, ancestor package overlap, rework/scrap/loss, unknown
return custody, insufficient new cap, school transfers, missing audit/provenance or
standalone records proposed for project attachment. Automation may suggest, never approve.

## 8. Worked outcomes

Synthetic quantities from 13M-B, not company BOM assertions:

| School | Approved quantities and ownership |
| --- | --- |
| A, Science G8/G9/G10 each 2, explicit completeScienceSets=2 | Activity wire 0.6 m + common 1.2 m + universal 0.6 m = 2.4 m; six grade-set/common crate slots, two universal slots. |
| B, Science G8=3, explicit completeScienceSets=0 | Activity 0.3 m + common 0.6 m = 0.9 m; three grade/common slots, no universal. |

Compatible total wire=3.3 m, but school caps remain independent. A opens two 1.2 m
complete-set commitments: H=2.4/U=0. Another 0.0001 m conflicts despite B spare
capacity or plentiful stock. First set PR->PO->receipt->reservation retains H=2.4;
pick 1.2 gives F=1.2/H=1.2/U=0. Delivery fulfills that set's slots, no second wire
charge. Cancel untouched second set only after supplier/source settlement: F=1.2,
H=0/U=1.2. Cancelling delivered first set restores nothing. Two pouch references to
the same activity material add no second demand.

Variant: A explicit completeScienceSets=0 plus Maths G8=1 (0.4 m) yields
0.6+1.2+0+0.4=2.2 m; Maths adds no common crate, A gets no automatic universal.
B stays 0.9 m.

Historical B: old cap 0.9, proven picked F=0.3, untouched H=0.2; new total cap 1.2
means U=0.7. New cap 0.4 blocks because F+H=0.5. Proven release of H=0.2 allows
U=0.1. If F alone were 0.5 cancellation cannot cure it. Original pick/binding stays.
Unknown consumption blocks even if apparent new capacity seems ample.

Manufacturing: school cap 10 bottles, root H=10; WOs 6+4 consume all output source
coverage; another WO 1 conflicts. Raw ingredient budgets derive from each frozen
recipe slice, never add litres to bottle caps. Accepted QC 6 creates stock and retains
coverage. Reject/rework preserves its slot; extra recipe inputs block absent explicit
resource authority. School demand does not grow.

Units/packages: 1,200 mm at frozen factor 0.001 equals 1.2000 m exactly. Successive
workflow records still cover one 1.2 m root. Planning 0.000001 m cannot enter a
four-place stock ledger: block, never round each request. One kit with three packages
consumes one kit entitlement and distinct materials; parent/child claims cannot duplicate it.

## 9. Migration, rollback, performance and acceptance

Future additive migration preserves original rows and guards, creates indexed new
structures, and marks existing graphs unreconciled. No backfilled approval/binding.
Dry-run classification precedes explicitly approved imports with stable per-source
keys, actor/time/batch/algorithm/source hashes and before/after fingerprints. Seed F/H
only from accepted evidence; unresolved graphs stay blocked. Replay events against
projections and authoritative sources; discrepancies prevent activation.

Cut over every consequential writer and DB guard together after review. Shadow
read-only comparisons are useful; permissive dual writes are unsafe. Retain whole-site
packing limits until a separate partial-allocation contract is approved. Index account
events/sequences and tenant/source claims; update only affected projections. Reports
run outside write transactions. Benchmark same-site contention and combined-school work.

Before activation, remove only empty new structures after preservation checks. After
events exist, prefer forward fixes or disable execution, preserving/exporting all
decisions/events. Application rollback must keep fail-closed barriers, never return
to individual request checks. Schema rollback cannot undo stock/custody or delete
approvals/history. Compensating operational actions need separate authorization.

Implementation acceptance tests, isolated synthetic PostgreSQL:

- Cumulative caps across distinct keys/draft PRs/repeated WOs/packing duplicates,
  reservation edits and source overlap through HTTP, direct service and SQL guards.
- Every matrix transition: partial residuals, cancellation after use, settled versus
  outstanding sources, returns/retries, rework/QC and descendant overlap. Assert both
  dimensional conservation and physical ledger/custody totals.
- Multi-school/Science/Maths examples, explicit zero/missing universal counts, shared
  references, pinned versions, exact/inexact units, precision and overflow.
- Barrier-controlled races above; reversed lock attempts, bounded deadlock retries,
  multi-account rollback. No negative remaining demand or duplicate source allocation.
- Inject failures after execution/stock/event/projection/audit/mapping/retry writes:
  all effects roll back. Lost-response retries create one result only.
- Increased/decreased/removed/replaced revisions; immutable completed/orphan history,
  consumed cancellations, partial receipts/custody, self-approval attribution,
  revoked/demoted admins, forged/cross-tenant identities and stale evidence plans.
- Repeat imports/replay, concurrent reviewers and authorization overlays through
  installation/closure; no fabricated approval or duplicate F/H.
- Populated migration/rollback fingerprints, query plans/contention, then regression,
  typecheck/build required for the implementation changes.

Fresh documentation checks: starting local/remote SHA, relative-link existence,
diff whitespace and staged path review; final hashes recorded in checkpoint/handoff.
No application tests/builds or database mutations run: user requested focused checks
only when necessary, and static evidence suffices for this documentation scope.
13M-B test counts are historical evidence, not newly verified results.

## 10. Human decisions and implementation recommendation

Recommend accepting central ledger, total-to-date caps, conservative releases and
explicit historical reconciliation. Before implementation, human authorization must:

1. Accept draft capacity holds and separate recipe-input budgets; define any additional
   loss/rework resource authority, supplier replacement treatment or financial limits.
   Default deny rather than invent exemptions.
2. Confirm reconciliation actors/evidence, any two-person review requirement, and
   separate stock/custody correction approval policy.
3. Approve additive schema/guard integration and populated rollback. Immutable binding
   preservation plus current authorization overlays must work at every source gate.
4. Scope backend-only ledger invariants, all writer boundaries, carry-forward,
   read-only reconciliation preview then controlled apply, adversarial tests and
   independent review. Keep operational rollout blocked until accepted.

Only subsequently scope modern approval UI: total approved/committed/consumed/remaining,
retained versus current approval, stock unknown versus verified, reconciliation blockers.
No UI integration, gate relaxation, company-data changes, deployment or main merge.
Stop for user review. Use `/new` or `/compact` before implementation.
