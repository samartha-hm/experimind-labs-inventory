# D6-C procurement-to-production ownership decision contract

**DRAFT / NOT AUTHORIZED — accountable human approval required.**

Refined 2026-10-28 against `e9362383653cd1ac7955c66a9d341deeb0f73ec6`.
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

### O1 — Which owner and source may transfer material responsibility?

**Recommendation:** use accepted receipt coverage linked to a live PR claim as
the exclusive procurement source, and an approved recipe input reservation as
destination. Procurement retains supplier/payables liability; production accepts
custody and consumption accountability for an exact quantity. Require procurement
owner and production owner approval, with an independent inventory controller
reviewing receipt/stock reconciliation. These are proposed responsibilities,
not newly granted application roles.

**Dimension boundary:** procurement source coverage identifies eligible PR/PO/receipt
intervals; it is provenance, not additional H. Supplier performance, title, invoices
and payables remain with procurement/finance under their own contracts. Physical
S/R represents custody and reservation, not responsibility. Exclusive material
responsibility identifies exactly one accountable owner per unfulfilled raw H
portion. School entitlement remains bound to its approved school/demand line.
The proposed handover changes only that exclusive responsibility owner; source
coverage, supplier/payables obligations, S/R and school entitlement do not transfer.
Any change to another dimension needs its own explicit authority and witnesses.

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
raw input atomically settles only the corresponding transferred raw-material
responsibility portion, recording raw F and reducing its H by the exact issued
quantity in the same item/base unit. Untransferred and unissued portions remain H. It must
reference the original accepted stock posting and destination reservation. Physical
issue remains the only debit; the additional event is commitment evidence only.
Supplier/payables obligations are unaffected: issue is neither invoice payment nor
supplier discharge. Scrap is separately attributed to issued input under an approved reason policy.

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

**Recommendation (proposed, blocked pending approval):** work-order cancellation returns only unissued responsibility to
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

**Mapping contract:** freeze output item/base unit, output lot/batch, allocation ID,
school/site and approved demand revision for every quantity. Freeze a package tree
(parent crate, child pouch/package and leaf output quantities); aggregate ancestors
from leaves, never count a parent and its children twice. A school deliverable can
contain unequal quantities and multiple output items. Amend unused allocations only
with new approved versions; preserve prior mapping and accepted quantities.
Partial delivery must identify accepted leaf quantities and remaining balances;
a slot counter alone cannot prove partial material acceptance. If current slots
cannot represent that acceptance, block settlement until a separately approved
representation exists. Damaged, rejected, lost or missing leaf quantities retain
output H; incident/replacement or write-off needs a new approved contract. Never
settle them by dispatch, a parent-package acknowledgment or assumed unit equality.
Same-key duplicate acknowledgment returns its retained result only with current
authorization; changed payload and another key for the same accepted leaf interval
reject. Overlapping parent/child acknowledgments cannot settle twice.

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
Material holds are operational blockers, not monetary balances. Under a separately
signed finance policy, unpaid invoices/payables, supplier credits/refunds,
freight accruals, tax reconciliation and warranty/retention balances may remain
open after operational closure only if individually registered with amount/currency,
finance owner, due date, reconciliation evidence and collection/payment controls.
This is a proposed permission, not an existing waiver. Any financial dispute that
still implies unresolved material H continues to block closure. No finance policy
may bypass migration 32 or discharge material by monetary netting.
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
as runtime authority. The requester/executor cannot approve their own command; procurement and production
approvals must be held by distinct authorized people, with independent inventory
review. No shared identity or client-supplied role substitutes for separation.
Every event records actor, both approvals, reason, quantities,
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
scoped documentation verification for this refinement; no runtime work is authorized.


## Business-decision matrix — all choices unsigned

| ID | Recommended choice | Explicit alternative requiring decision |
| --- | --- | --- |
| O1 | Accepted source-linked stock; transfer exclusive material responsibility only; separate supplier/payables, custody and entitlement | Procurement retains responsibility through accepted delivery; define discharge separately |
| O2 | Preserve exact school, grade, subject, input and approved demand lineage | Future school reassignment under a separate contract |
| O3 | Exact base units and scaled arithmetic; reject unsupported conversions/rounding | Approve item-specific conversion or tolerance with explicit loss authority |
| O4 | Atomic partial subdivision/handover with exclusive remainder ownership | Whole-claim handover only |
| O5 | Exact source-linked physical issue settles corresponding transferred raw H only | Retain raw H until delivery under a different approved discharge contract |
| O6 | On cancellation, compensate unissued ownership back to procurement; separately release eligible R | Retain production responsibility and R pending manual reconciliation |
| O7 | Retain unused accepted stock and procurement H pending an approved disposition | Approve distinct available-inventory, reuse, supplier-return, cancellation or reassignment contract |
| O8 | Settle output H by immutable accepted leaf quantities mapped to school delivery | Packing-QC settlement plus a separately modeled shipping/loss obligation |
| O9 | Keep all existing closure checks and zero account/claim H; separate approved financial tail | Closure waiver is outside this recommendation and remains blocked |
| O10 | Live authorization, separated approvals, restricted writer, atomic append-only events and strict idempotency | Eventual reconciliation requires separate suspense/recovery authority; excluded initially |

## O6/O7 disposition decision table

All proposed dispositions below are blocked until signed approval and separate
implementation authorization. Existing authorized reservation release is not
permission to change responsibility, entitlement or procurement coverage.

| Disposition of unconsumed material | Proposed effect and required evidence | Contract needed |
| --- | --- | --- |
| Retained | Keep S, H, school entitlement and current owner; retain R while the approved reservation remains live; name custodian and reconciliation owner | O6/O7 retention decision; no new disposition authority |
| Return to available inventory | Release eligible R only through its authorized path; S unchanged. Physical availability does not erase H or free school-owned material for another demand | New availability/disposition contract specifying H, entitlement and eligibility treatment |
| Reuse | New destination recipe/input, exact source and unit witnesses, approved reservation and exclusive ownership link; no second receipt or implied raw settlement | New reuse contract; O1–O5 alone do not authorize reuse |
| Supplier return | Verified unconsumed stock, lot/location, supplier acceptance and physical outbound evidence; separately reconcile claim/coverage and credit/payables | New supplier-return and finance contracts; no automatic S credit or H release |
| Cancellation | Work-order cancellation may reverse only unissued responsibility under proposed O6; procurement/demand cancellation must explicitly choose H release and A/U treatment; never undo issued F | O6 approval for work-order reversal; new procurement/demand cancellation contract for other effects |
| Future approved school reassignment | Revised school entitlement, source/destination approvals, compensation and disjoint lineage; no implied availability from common SKU | New school-reassignment contract; blocked under O2 |

Pending/quarantined/rejected coverage is never accepted stock. Completion,
timeout, cancellation labels and supplier replacement cannot select a disposition
implicitly. Issued material requires a separate scrap/return/recovery policy;
it is not unconsumed material available for these shortcuts.

## Exact accounting examples — hypothetical policy, no postings

Notation: P = procurement commitment H; M = raw-material H; X = output H;
D = school-delivery F. P and M describe the **same raw commitment**, viewed by
source and responsibility; never add them. P is not PO coverage. Raw tuple
remains (A,F,H,U). Supplier obligations below are illustrative contract values,
not stock valuation or an assertion about actual invoices. Every row is independent
unless explicitly labeled sequential; all quantities use the stated unit.

| Event | Procurement H / coverage before → after | Raw-material H / raw F before → after | Physical S/R before → after | Output H before → after | School-delivery F before → after | Financial obligations before → after |
| --- | --- | --- | --- | --- | --- | --- |
| Accepted QC, 10 m | P 10→10; PO coverage consumed 0→10 m | M 10→10, F 0→0 m | S 0→10 m, R 0→0 m | 0→0 units | 0→0 deliverables | Supplier contract INR 1,000→1,000; unpaid invoice INR 1,000→1,000; no payment |
| Reserve and hand over 4 m after QC | P 10→10; same accepted interval | M 10→10 (procurement owner 10→6, production 0→4), F 0→0 m | S 10→10 m, R 0→4 m via separate reservation evidence | 0→0 | 0→0 | Both INR 1,000→1,000 |
| Issue 3 m, sequential | P 10→7; immutable coverage remains 10 m | M 10→7 (procurement 6, production 1), F 0→3 m; tuple (10,0,10,0)→(10,3,7,0) | S 10→7 m, R 4→1 m | 0→0 | 0→0 | Both INR 1,000→1,000 |
| Cancel remaining work-order reservation, sequential | P 7→7; coverage unchanged | M 7→7 (procurement 6→7, production 1→0), F 3→3 m | S 7→7 m, R 1→0 m | 0→0 | 0→0 | Both INR 1,000→1,000 |
| Produce 5 units from already issued input, independent output example | P 7→7 | M 7→7, raw F 3→3 m | Raw S/R 7/0→7/0 m; output S/R 0/0→5/0 units under existing completion contract | 0→5 units under separate output commitment | 0→0 of 2 deliverables | Both INR 1,000→1,000 |
| Pack/dispatch, sequential | P 7→7 | M 7→7, raw F 3→3 m | Raw 7/0→7/0 m; output 5/0→5/0 units in this custody-only example | 5→5 units | 0→0 | Both INR 1,000→1,000 |
| Accept deliverable A with 2 mapped units; B owns 3, sequential | P 7→7 | M 7→7, raw F 3→3 m | Raw 7/0→7/0; no acknowledgment stock posting; output custody follows existing contract | 5→3 units; output F 0→2 | 0→1 of 2 deliverables | Both INR 1,000→1,000 |
| Duplicate A acknowledgment, sequential | P 7→7 | M 7→7, raw F 3→3 m | All S/R unchanged | 3→3 units | 1→1 | Both INR 1,000→1,000 |
| Accept 2 of B's 3 leaf units; 1 damaged, sequential | P 7→7 | M 7→7, raw F 3→3 m | All S/R unchanged by settlement; incident tracked separately | 3→1 unit; output F 2→4 | 1→1 complete deliverables; B remains incomplete | Both INR 1,000→1,000 |
| Attempt closure, sequential | P 7→7 | M 7→7, raw F 3→3 m | All S/R unchanged | 1→1 unit | 1→1 | Both INR 1,000→1,000; DENY closure for material and delivery blockers |

A parent crate contains A's pouch (2 units) and B's pouch (3 units), total 5.
Acknowledging the parent cannot add another 5 after child acceptance. B's partial
acceptance is a proposed leaf-acceptance model, not a claim that existing slot APIs
support it. It must remain blocked if no approved partial representation exists.
Different output items or units require separate rows, never a summed settlement.
Once all material holds and other operational blockers are independently resolved,
operational closure itself changes no quantities or money. An unpaid INR 1,000
invoice may remain open only under the separately signed O9 finance controls.

## Transition and evidence matrix

ALLOWED means only an existing authorized contract under its current gates; it
authorizes no execution in this documentation task. PROPOSED means unavailable
until policy approval, implementation authorization and acceptance. BLOCKED means
excluded from this contract or unsupported even by the recommended choices.

| Action | Status | Required evidence / invariant |
| --- | --- | --- |
| Existing PR hold and PO coverage | ALLOWED under D2 contracts | Approved demand/PR/PO revisions, disjoint coverage; PO adds no H |
| Receipt, quarantine, rejection | ALLOWED under receipt contract | Immutable coverage consumed once; no stock or material settlement on rejection |
| Accepted incoming QC | ALLOWED under receipt contract | Accepted receipt posting; S increases once, A/F/H/U unchanged |
| Existing reservation/release | ALLOWED only under its own authorized path | Exact stock/reservation and actor; no new responsibility or school entitlement effect |
| Exclusive source link, partial split and handover | PROPOSED O1–O4/O10 | Accepted source interval, same-school input, both approvals, reviewer, atomic conserved H |
| Physical work-order issue | ALLOWED only under existing authoritative issue contract | Exact reservation/input posting; S/R debit once; no implicit new raw settlement |
| Couple issue to raw H settlement | PROPOSED O5/O10 | Source-linked issue ID, transferred portion, item/unit/quantity and retained response, same transaction |
| Reverse unissued ownership on work-order cancellation | PROPOSED O6 | Exact remaining portion, compensating event and separately authorized R release; F/S not reversed |
| Retain unused accepted material | ALLOWED as current non-settlement state | Existing owner, custody, H and reconciliation remain; future O7 policy unsigned |
| Available inventory / reuse / supplier return / demand cancellation / school reassignment | BLOCKED pending separate contracts | Disposition table above; no automatic claim/coverage/financial changes |
| Completion, output, packing QC and dispatch | ALLOWED only under existing D3/D4 gates | Output/custody/package evidence; no second raw debit or new raw/output H settlement |
| Exact accepted school-delivery slot acknowledgment | ALLOWED only under existing D4 gates | Existing slot/destination evidence; does not currently discharge output H |
| Couple accepted leaf output quantities to output H settlement | PROPOSED O8/O10 | Immutable school/output/package mapping, accepted intervals and atomic acknowledgment |
| Partial leaf acknowledgment not representable by existing slots | BLOCKED until separately approved model | Explicit partial evidence, complete/incomplete slot rules and remainder |
| Damaged/lost/rejected package settlement, scrap write-off or replacement discharge | BLOCKED pending separate contract | Incident, quantity, responsible owner and independent loss/replacement authority |
| Installation acknowledgment | ALLOWED only under existing service contract | Installation evidence; cannot settle missing delivery or raw/output material |
| Exact retry / concurrent command | ALLOWED for existing paths; PROPOSED for new transitions | Live session/tenant permission before replay; same key/hash retained response, no double effect |
| Changed-payload retry / overlapping interval with different key | BLOCKED | Durable idempotency and interval exclusivity reject without mutation |
| New project closure | ALLOWED only under unchanged D6-R guard | Existing checks plus zero account and claim holds, including absent balance cache |
| Open financial controls after operational closure | PROPOSED O9, separate approval | Finance register, amounts, owners, due dates and no unresolved material holds |
| Historical rewrite/backfill, generic transfer shortcut, implicit conversion or school substitution | BLOCKED | No retroactive authority, aggregate matching or owner/service SQL bypass |
| Revoked/foreign/stale session or approval; unaudited/non-atomic new writes | BLOCKED | Live authorization, restricted writer and full rollback on failed evidence |
| Migration, real stock posting, deployment or pilot activation in this task | BLOCKED | Separate explicit authorization required; none supplied |

## Approval register — no approval recorded

Each row must be completed by actual humans with APPROVE / REJECT / REVISE,
selected text or alternative, effective date and scope (tenant, project, school,
item/unit, source/destination, applicable revisions and exclusions), conditions,
supporting evidence and verifiable dated signatures. Role labels below are
required responsibilities, not named people or application permissions. Blank
entries are unresolved and cannot authorize implementation or operations.

| Decision | Required named responsible business owners (names absent) | Effective scope | Decision / chosen text | Date | Supporting evidence / signatures |
| --- | --- | --- | --- | --- | --- |
| O1 | Procurement + production; independent inventory controller | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O2 | Project + curriculum/kit | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O3 | Manufacturing/engineering + inventory | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O4 | Procurement + production | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O5 | Procurement + production + finance/controller | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O6 | Production + inventory; procurement accepting returned responsibility | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O7 | Procurement + inventory + finance | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O8 | Production + logistics + project | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O9 | Project sponsor + finance + inventory | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |
| O10 | Security + inventory + finance; procurement/production approve separation | NOT RECORDED | UNRESOLVED | NOT RECORDED | NONE |

No omnibus approval resolves unspecified alternatives. Revisions invalidate unused
approval scope; already recorded events remain append-only. Additional disposition,
conversion/loss, partial-delivery and financial-tail contracts need their own named
owners and signed scope before they can override a blocked choice.

## Development gate and questions source code cannot answer

Only after signed policy choices and a separate implementation instruction may
engineering develop source-linked ownership splits, issue-linked raw settlement,
unissued reversal, immutable package/leaf allocation, output settlement and the
associated restricted commands, recovery and adversarial tests. Any schema work
needs separate migration authorization and preservation/rollback rehearsal. Business
approval does not authorize migration execution, real inventory, deployment or pilot.

Unanswered business choices remain:

- Who are the named accountable owners, independent reviewers and substitutes;
  what scopes, effective dates and approval-revocation rules do they accept?
- Does material responsibility end at source-linked issue or accepted delivery,
  and who owns scrap, damage, theft, shortages and supplier disputes?
- Which retained, availability, reuse, supplier-return, cancellation or school
  reassignment dispositions are permitted, and what happens to H, A/U, entitlement,
  supplier coverage, title and credits in each? Who approves each separate contract?
- Are partial handovers allowed; which item conversions, yields, tolerances or
  losses are approved? Code cannot establish commercial equivalence.
- Which exact output quantities belong to each school/deliverable and package;
  how should partial acceptance count slots, and who accepts damage or replacement?
- Which financial obligations may survive operational closure, with what amounts,
  deadlines, owners, escalation and reconciliation evidence?
- Who funds and approves implementation and any later migration, deployment and
  pilot gates? No such authorization is recorded here.

**DRAFT / NOT AUTHORIZED. D6 software BLOCKED. Operational pilot NO-GO.**
