# Milestone 13M-D2A — Reservation commitment integration

2026-10-18. Verdict: **CONDITIONAL PASS**, isolated synthetic development only.
Baseline: `9878626694038ccd4978b1e4b086d0e5cabc9229` on
`feature/kit-builder-milestone-1`. No production route or writer pool is enabled.

## Reservation contract

An account identifies organization, project, school/site, canonical inventory
material and unit. Authorization comes from the current frozen approval's material
lines for that exact identity. Let A be approved demand, F consumed demand and H
all exclusive held claims, including other source kinds. Every commit preserves
`A - F - H >= 0`; reservations do not decrement physical inventory.

| Mutation | Operational result | Commitment effect | Gate |
|---|---|---|---|
| Create q | Active revision 1 | H increases q | Current approval, exact identity, capacity and verified physical availability |
| Increase q to n | Next active revision | H increases n-q | Same checks; exact expected reservation revision |
| Decrease q to n | Next active revision | H decreases q-n | Proven untouched, exclusive remainder only |
| Release/cancel | Released/cancelled next revision | H decreases remaining q | No historical or mixed-stage evidence |
| Same capability/request retry | Original saved response | No new writes | Current session, authority and approval remain valid |
| Fulfill | BLOCKED | No changes | Exclusive downstream consumption lineage is absent |
| Transfer/split/reparent | BLOCKED | No changes | Reservation witness forbids unsupported lineage |
| Historical attachment | BLOCKED | No changes | No invented approval or assumed zero consumption |

Planning arithmetic uses six decimal places; physical reservations require exact
four-place quantities. Nonrepresentable amounts are rejected rather than rounded.
Units must match the inventory item's canonical unit and frozen approval line.
New conversions are not inferred. Frozen material lines are summed deterministically;
school/site or unit mismatches cannot borrow another account's capacity.

## Authority, lineage and atomicity

`TrustedLedgerAuthority` accepts a signed, short-lived D1W session capability bound
to actor, tenant, action, operation key, canonical payload digest and authorization
ID. Caller-supplied actor/organization/role fields convey no authority. Membership,
session revocation and database-clock expiry are checked transactionally. The
private writer and signing process remain trusted; their compromise is excluded.

The adapter executes operational reservation, immutable reservation/account/
entitlement mapping, delta claims and events, approval execution binding, supply
audit snapshot and immutable response receipt in one PostgreSQL transaction.
Failure rolls all of them back. Mapping stores the initial operation key; each
positive delta has a distinct claim whose real source is reservation ID and whose
slice is reservation revision. Negative deltas release those existing claims.
Deferred witnesses require active reservation quantity to equal its exclusive H,
F to remain zero, and the exact immutable current approval binding to exist.
They also reject unpaired operational changes, even through owner SQL.

Lock order is current project, account/balance and source, inventory item, then
reservation. Project locks serialize both reservation writers and downstream gates;
release locks claims in ID order. Physical stock guards retain stocktake/scope,
tenant and on-hand-minus-active-reservations checks, including production inputs.
No stock-ledger event or inventory quantity update occurs in this milestone.

Runtime SQL loses writes to reservations, supply audit and execution bindings in
the activated schema. It cannot write ledger/mapping tables or execute commitment
functions. Separate LOGIN writer/identity roles, fixed invoker function paths and
absence of inherited/owner/CREATE authority remain required. Startup validates
both excessive and missing grants. Legacy reservation service calls fail closed;
there is no fallback to their former per-request demand checks. Runtime identity
SELECT exposure remains a previously documented limitation.

## Historical and downstream barriers

Any unmapped reservation or purchase-request, purchase-order, production, packing,
delivery, installation or completion evidence for the project blocks integration
and release, regardless of status. This conservative gate deliberately does not
guess whether older consumption is zero. Historical reservations remain unchanged.

Once a project has a D2 reservation mapping, insert/update gates block those seven
unintegrated downstream roots, including JSON project lines on procurement roots.
The block persists after reservation cancellation. Existing 13M-B approval barriers
remain in place. Fulfillment requires a future atomic claim-to-consumption mapping
with exact exclusive downstream and physical-stock lineage; it is not enabled here.

## Verification and reconciliation

Focused PostgreSQL: **37/37**. The integrated D2 checks exercise:

- Last-capacity race: exactly one of two reservations succeeds against shared H.
- Adjustment versus cancellation: one expected-revision winner.
- Fulfillment versus release: fulfillment fails and untouched release succeeds.
- Delta increase/decrease, same-capability immutable retry and new-key duplicate.
- Conflicting payload, new capability on an already-used key, expired capability,
  ordinary access bearer, missing authority and forged HTTP actor/role authority.
- Cross-tenant authenticated request, mismatched unit/site, sub-stock precision,
  stale reservation/approval revision, logout, permission revocation and replay.
- Restricted LOGIN direct SQL denial; owner unpaired mutation rollback; legacy
  service denial; historical release denial and downstream procurement gate.
- Lost response recovery through a recreated authority with a separate pool;
  immutable receipt and projection replay match committed balances.

Before/after fingerprints cover 22 operational tables. Only synthetic reservations
and their supply audit change; the other **20 table counts and hashes match**,
including stock ledger, inventory, procurement, production, packing and custody.
Rejected requests additionally compare eleven reservation/ledger/audit/binding
table fingerprints. See the accompanying JSON for exact counts and hashes.

Full automated suite: **583/583, 76 files**, two workers, 35.67 seconds without
concurrent build load. Typecheck and frontend/PWA/server builds **PASS**.
An initial full run had two attachment-store failures
because TEMP was set inside the source tree; the rerun uses external temporary
storage. That rerun overlapped the finishing build and reproduced the existing
packing-label 5000ms timeout (582/583); the subsequent idle full run passed.
No test assertions or timeouts were relaxed. Existing bundle-size warnings
are unrelated. Default-worker packing-label reliability remains a prior limitation;
the acceptance suite uses two workers.

## Activation, rollback and recovery

`AddReservationCommitments1792540800018` is deliberately absent from startup
migrations. It rejects every database except `experimind_kitbuilder_test` and every
schema except `requirement_test_<32 lowercase hex digits>`. The focused integration
helper demonstrates transactional up/down/up followed by explicit owner
`configureDatabaseBoundary` and restricted-role startup assertions. No operational
server is switched to this adapter, and no credentials are changed outside the
synthetic test fixture. D2A supplies an internal writer and test-only HTTP harness.

Empty rollback is tested. Nonempty rollback takes exclusive locks and refuses to
erase evidence; use backup/restore and replay. ACL revocation is not undone by
schema rollback, so legacy writers remain denied until explicit operator review
and reprovisioning. There is no automatic permissive rollback path.

The recovery runner accepts `COMMITMENT_RECOVERY_MILESTONE=13md2a`, reads the
ignored synthetic evidence file, and restricts itself to localhost port 55432 and
the isolated test database. A schema dump restored into a fresh disposable schema
matches **12 table fingerprints**, including mapping, reservation, audit and binding.
Replay passes for **24 accounts and 65 events**. All **11 invoker functions** retain
pinned paths; ledger and three reservation deferred witnesses restore enabled.
Recovery evidence contains no credentials. This is schema backup/restore plus
independent connection recovery, not a process-restart or production DR claim.

## Acceptance boundary

Atomic cumulative reservation accounting, capability authorization and direct SQL
denials pass in the activated synthetic schema. Acceptance is conditional because
no production HTTP issuer/pool/adapter is mounted, downstream consumption remains
unintegrated, historical reconciliation is unavailable, and staging role/ACL/TLS/
secret/startup validation remains outstanding. No company inventory changes,
deployment, main merge, UI expansion, D2B or D3 work is included.
