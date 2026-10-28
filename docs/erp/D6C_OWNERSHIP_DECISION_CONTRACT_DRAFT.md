# D6-C procurement-to-production ownership decision contract

**DRAFT / NOT AUTHORIZED — accountable human approval required.**

Prepared 2026-10-28 against `41bf6d696e5ddf7d9900e53ae2fa6e374fbc05ec`.
This document proposes business policy; it grants no runtime, migration, stock,
settlement, historical activation, deployment or pilot authority. No decision
below is approved. Named accountable people and recorded decisions are absent.
An engineering sign-off cannot substitute for the business approvals below.

## Established authority and boundary

Read with the [D6 report](D6_OPERATIONAL_PILOT_PREPARATION.md),
[D2A reservation](ui-ux/MILESTONE_13M_D2A_RESERVATION_COMMITMENTS.md),
[D2B1 PR](ui-ux/MILESTONE_13M_D2B1_PR_COMMITMENTS.md),
[D2B2-A PO](ui-ux/MILESTONE_13M_D2B2_A_PO_COMMITMENTS.md),
[D2B2-B-S receipt](ui-ux/MILESTONE_13M_D2B2_B_S_FALLBACK_AND_RECOVERY.md),
[D3 completion](ui-ux/D3_COMPLETION_ACCEPTANCE.md) and
[D4 acceptance](ui-ux/D4_DISPATCH_DELIVERY_CLOSURE_ACCEPTANCE.md) contracts.
D6-R migration `1793232000032` supersedes D4's produced-output hold exception:
**any nonzero account hold or claim hold blocks closure**, including claims
whose balance cache is absent. Its function identity/ACL and rollback refusal
remain intact. No historical row is reopened, settled, deleted or reclassified.

Today PO coverage is a subset of PR H, not another H. Receipt, quarantine and
rejection consume immutable PO coverage; only accepted incoming QC posts stock.
QC leaves procurement A/F/H/U unchanged. Work-order issue debits physical input
once. Output, packing and delivery do not debit it again. Delivery acknowledgment
fulfills school slots, not raw-material holds. Generic ledger `transfer` mechanics
are not an approved procurement-to-recipe policy or cross-account conversion.

## Quantities and proposed witnesses

For each commitment account, A is approved, F fulfilled, H held and
U = A − F − H; require A ≥ F + H and nonnegative values. Examples below use
`(A,F,H,U)` and quantities in the account's explicit unit. Physical stock S and
physical reservation R are separate quantities, never added to commitment H.
Money/payables, title and supplier obligations are also separate from F.

A proposed immutable ownership link must freeze these source witnesses:
tenant, project, school/site, current approval ID/revision/hash, entitlement,
material account and claim, PR/revision/line, PO/revision/line and disjoint
coverage interval, receipt/line/interval, accepted QC decision, physical posting,
item UUID/SKU/base unit, location/lot where supported, quantity and actor.
Destination witnesses must freeze published recipe/version/hash, work order and
revision, input budget/line, input item/unit/location, reservation, output
entitlement/item and all contributing school/grade/subject/demand lines.
Later issue, output, allocation, package, dispatch, delivery and installation
IDs extend this chain append-only; they do not replace its source witnesses.
Missing, ambiguous, inactive or foreign witnesses must deny the transition.

Matching names, SKU strings, school IDs or total quantities alone are inadequate.
Do not infer lot provenance from an aggregate location balance. A requirement
revision change invalidates unused authority; it does not erase earlier events.

## Decisions requiring approval

Each numbered decision is independently unresolved. “Approve D6-C” without
these choices, named people and recorded scope is insufficient.

### O1 — Which owner and source may transfer liability?

**Recommendation:** use accepted receipt coverage linked to a live PR claim as
the exclusive procurement source, and an approved recipe input reservation as
destination. Procurement retains supplier/payables liability; production accepts
custody and consumption accountability for an exact quantity. Require procurement
owner and production owner approval, with an independent inventory controller
reviewing receipt/stock reconciliation. These are proposed responsibilities,
not newly granted application roles.

**Alternative/consequence:** retain procurement ownership until final delivery;
production can use stock but procurement remains accountable for the whole chain.
This prolongs residual holds and requires a different explicit discharge policy.
**Example:** raw `(10,0,10,0)`, S=10; accepting responsibility for 4 leaves account
totals and S unchanged, with source-owned H=6 and destination-owned H=4.
**Risk:** an unlinked PO or counted stock could be used to launder provenance.
**Approval required:** named procurement, production and inventory owners choose
the source, liability boundary and dual approval, including substitutes and scope.

### O2 — Exact school, SKU and grade lineage

**Recommendation:** retain every approved contribution when a work order pools
the same output SKU. Allocate source quantities exclusively to exact school and
input budget lines; no tenant/project transfer, school substitution, silent grade
mix or obsolete approval is eligible. Shared pouch definitions must not duplicate
physical demand. Multiple source receipts may fund one input only through explicit
disjoint links, and one source cannot fund two destinations for the same interval.

**Alternative/consequence:** permit school reassignment under a separate revised
requirement and compensation contract; this adds authorization and reconciliation
work and cannot be inferred from a common SKU.
**Example:** A owns 6 m, B owns 4 m; a 3 m link to A leaves A=3 and B=4 unlinked,
not a fungible project remainder of 7 eligible for either school. All A/F/H/U
and physical totals remain unchanged at linking.
**Risk:** cross-school fulfillment and duplicate universal/common-kit demand.
**Approval required:** project and curriculum/kit owners approve exact selectors,
aggregation rules and the prohibition on reassignment in this contract.

### O3 — Units, recipe yield and rounding

**Recommendation:** quantities must be positive canonical numeric(12,4) values;
use integer scaled arithmetic and reject excess precision. Same material movement
requires the same item and base unit. A published recipe may specify input/output
yield, but yield is not a stock conversion. A source in m cannot fund input in g
without a separately approved item-specific conversion witness/version and
conservation rule; absent that, deny the link. Never round upward to available stock.

**Alternative/consequence:** allow a documented rounding tolerance with an explicit
loss account and approver; this needs a new loss authority and is excluded here.
**Example:** receipt 1.2345 m split 0.4000 + 0.8345 m reconciles exactly;
0.40001 m rejects. Issuing 3.7000 g for recipe output 3.7000 m debits only g;
it cannot discharge a 3.7000 m procurement claim by numeric equality.
**Risk:** hidden stock creation and dimensionally invalid settlement.
**Approval required:** engineering/manufacturing and inventory owners approve base
units, permitted conversion references and rejection instead of rounding.

### O4 — Partial transfer and remainder ownership

**Recommendation:** split an unfulfilled claim into immutable exclusive portions
before transferring a portion; carry entitlement/cap and receipt coverage through
each child. Account H is conserved. Transfer requires both approvals from O1;
the parent remainder stays procurement-owned. A PO's unreceived coverage cannot
be transferred as received stock. No automatic expiry or remainder release.

**Alternative/consequence:** permit only whole-claim handover; partial production
waits for procurement to create eligible subdivisions, reducing flexibility.
**Example:** `(10,0,10,0)` split into 4 and 6, transfer 4, remains `(10,0,10,0)`;
two concurrent requests for 7 cannot both succeed. A failed split/transfer leaves
the original 10 intact, with no half-linked reservation.
**Risk:** orphaned remainder or double ownership after partial failure.
**Approval required:** procurement and production owners approve partial ownership,
who owns each remainder and whether split-plus-transfer must be one atomic command.

### O5 — Event that discharges consumed procurement material

**Recommendation:** a successful authoritative physical issue of the exact linked
raw input atomically consumes the transferred procurement claim portion. It must
reference the original accepted stock posting and destination reservation. Physical
issue remains the only debit; the additional event is commitment evidence only.
Scrap is separately attributed to issued input under an approved reason policy.

**Alternative/consequence:** discharge only at final accepted delivery; this leaves
raw H after physical issue and extends procurement responsibility through production.
Either choice needs explicit authority; neither exists today.
**Example:** before raw `(10,0,10,0)`, S=10,R=4; issue 3 yields proposed raw
`(10,3,7,0)`, S=7,R=1. Output/packing/delivery later produce no further raw debit
or raw F. Current software must not perform this proposed commitment settlement.
**Risk:** payment liability mistaken for consumed material, or settlement without issue.
**Approval required:** procurement, production and finance/controller owners approve
the discharge event, scrap responsibility and explicit separation from invoice payment.

### O6 — Unconsumed reservations and cancellation

**Recommendation:** explicit cancellation returns only unissued responsibility to
the procurement source through compensating append-only ownership events; release
the physical reservation under its existing authorized path. Already issued input
is irrevocable and is not returned by cancellation. Active trusted work-order and
legacy paths must be assessed separately; an old release implementation is not
authority for the new ownership contract. No background reaper settles ownership.

**Alternative/consequence:** keep unissued portions production-owned until manual
reconciliation, with closure blocked. This avoids a reverse handover but strands H.
**Example:** linked 4, issued 3 leaves destination H=1; cancellation returns that
1 to procurement H, leaves raw `(10,3,7,0)`, S=7 and releases only remaining R=1.
It cannot change F=3 or credit S by 3.
**Risk:** “cancel” recreates consumed input or silently makes stock available twice.
**Approval required:** production and inventory owners approve reverse responsibility,
reservation release, cancellation roles and non-reversible consumption treatment.

### O7 — Unused received stock and procurement failure states

**Recommendation:** accepted but unused stock remains physical custody with live
procurement H until an explicitly approved reuse, cancellation or supplier-return
contract exists. Pending, quarantined and rejected receipts remain ineligible for
handover; their consumed coverage is never reused. Replacement needs new approved
PO coverage under current authority. Keep unsupported PO decrease/cancel/return-to-PR
blocked. No blanket release on QC rejection, work-order completion or time elapsed.

**Alternative/consequence:** adopt an explicit return/reuse authority with physical
return witnesses and revised demand; this requires a separate decision and migration.
**Example:** accepted 6, pending 2, rejected 2 against PO 10: S increases only by
6, procurement `(10,0,10,0)` persists, and at most 6 can become eligible. If 4 are
issued, S=2 and proposed raw state is `(10,4,6,0)`; the other 6 do not disappear.
**Risk:** replacement over-ordering, hidden supplier obligations or released stock
being promised twice. **Approval required:** procurement, inventory and finance
owners approve this retained-liability policy and identify the separate return/reuse
decision owner. No return or reuse authority is approved by this document.

### O8 — Produced output and material-obligation discharge

**Recommendation:** retain work-order output-material H through output custody,
packing QC and dispatch; discharge only exact accepted school-delivery quantities
supported by immutable output allocation and acknowledgment lineage. Couple the
proposed material event to the existing delivery-slot acknowledgment atomically,
without changing slot arithmetic, posting stock or consuming raw input again.
Installation remains a separate service obligation and cannot substitute for missing
delivery lineage. Partial acknowledgment settles only the linked partial quantities.

**Alternative/consequence:** settle output H at accepted packing QC; then shipping
loss remains a separate liability and requires another explicit obligation model.
**Example:** output material `(5,0,5,0)` and slots `(2,0,2,0)`; accepted delivery
of one slot whose frozen allocation owns 2 output units gives proposed material
`(5,2,3,0)` and existing slots `(2,1,1,0)`. Dispatch or installation alone changes
neither material tuple. A slot count is never assumed equal to material quantity.
**Risk:** good delivered to the wrong school or a duplicate acknowledgment settles H.
**Approval required:** production, logistics and project owners approve this event,
allocation-derived partial quantities, rejection/loss handling and installation boundary.

### O9 — Closure eligibility and historical projects

**Recommendation:** retain migration 32 unchanged. New closure requires all existing
delivery/installation/custody checks and zero holds in both balances and claims.
Settlement must arise from approved witnessed events, never an exception for produced
output or delivered slots. Report material U separately from stock; U is uncommitted
demand, not automatically released inventory. Unresolved unused stock/liability must
receive a future approved disposition, even if a hold predicate alone would pass.
Historical closed records remain immutable and visibly report unresolved evidence;
there is no backfill, reopening or retroactive authorization.

**Alternative/consequence:** introduce a signed exception/waiver closure authority;
this weakens conservation visibility and is explicitly outside the recommendation.
**Example:** fulfilled slots `(2,2,0,0)` plus output `(5,0,5,0)` still deny closure.
Only a future authorized output discharge could make it `(5,5,0,0)`; installation
and every other blocker must also pass. Closure itself changes no A/F/H/U or S.
**Risk:** administrative closure conceals stranded liability or rewrites history.
**Approval required:** project sponsor, finance and inventory owners approve the
zero-hold gate, historical reporting and separate unused-liability disposition requirement.

### O10 — Execution, revocation, audit and reconciliation authority

**Recommendation:** use the trusted restricted writer, live active tenant permission
and session-bound capability checked before both new commands and exact retries.
Bind scope, approval revision, source/destination witnesses, payload hash and event
kind to a durable idempotency key. Lock source claim/coverage and destination budget
in a deterministic order and persist ownership, issue/ack, audit and retained response
in one transaction. Same-key same-payload retries return the same receipt only while
currently authorized; changed payload, stale revision, revoked session and different-key
replays of an already-owned interval reject. No owner SQL or service fallback counts
as runtime authority. Every event records actor, both approvals, reason, quantities,
units, before/after, parent/child IDs and immutable evidence references.

**Alternative/consequence:** eventual reconciliation across separate transactions
requires an approved suspense liability and recovery state; it cannot guarantee the
atomic conservation proposed here and is excluded from initial implementation.
**Example:** source H=4, two competing 3-unit consumers: one receives 3, the other
conflicts, H ownership totals remain 4. Audit failure rolls back everything; exact
retry adds zero records/stock, and revoked-session retry denies without mutation.
**Risk:** replay after revocation, split-brain ownership or unsigned settlement.
**Approval required:** security, inventory and finance owners approve actor/approval
separation, atomicity, revocation, audit retention and reconciliation responsibilities.

## Required proof after decisions, before implementation activation

An approved implementation specification must map each chosen policy to new
immutable witnesses, signed capabilities, restricted grants, replay arithmetic and
an upgrade/rollback plan rehearsed on a populated clone. Do not modify applied
migrations or infer approval from this package. Independently test:

- Partial link/issue/return with exact remainder, mixed receipts and missing provenance.
- Competing consumers, stale revisions, wrong tenant/school/SKU/grade/unit, excess
  precision, duplicate source coverage and aggregate-school output ambiguity.
- Pending/rejected QC, unused accepted stock, cancellation after partial issue,
  duplicate scrap, failed audit and transaction interruption at each write boundary.
- Output allocation and partial acknowledgment settle only the selected material
  liability, once; installation, dispatch, retry and closure never settle by implication.
- Same-key conflicts, different-key duplication, revoked sessions/permissions,
  direct SQL/service bypass, absent balance cache and historical closed records.
- Populated restart/restore, original-key retry, replay/fingerprint equality and
  closure denial while any proposed authority or required witness is absent.

These are future acceptance obligations, **not executed ownership-transfer tests**.
Current D2–D4 positive/retry/concurrency tests prove only their existing contracts.

## Approval record required to resolve the block

For O1–O10 record: APPROVE / REJECT / REVISE, named accountable approvers and
their roles, selected recommendation or exact alternative text, scope and effective
date, evidence/reference, unresolved conditions and signatures. Procurement,
production, inventory, project, curriculum, logistics, finance and security owners
must designate actual people; no names or sign-offs are invented here.

Separate authorizations are required for implementing the chosen contract,
migration/upgrade rehearsal, production deployment and operational pilot. Until
then ownership authority is **NOT APPROVED**, D6 software remains **BLOCKED**,
and operational pilot remains **NO-GO**. Stop at this decision package and the
independently supported browser/software verification for D6-C.
