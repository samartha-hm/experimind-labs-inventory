# Milestone 13M-D2A-R — independent reservation review

## Verdict: CONDITIONAL PASS

Reviewed 18 October 2026 on `feature/kit-builder-milestone-1`, starting at
`929935b34d9c1b4915751a08662dfb7075329170`. Local HEAD, cached remote HEAD and
live GitHub branch HEAD matched before review. The only pre-existing change was
an unrelated `AGENTS.md` edit, preserved and excluded from commits.

No reproducible production correctness/security defect was found in the isolated
D2A boundary. Acceptance does **not** authorize operational writer activation.
The production adapter, credentials/pool separation, historical reconciliation
and downstream consumption lineage remain prerequisites, as in D1W/D2A.

Reviewed repository directives, session/next-task handoffs, D2A implementation
report, 13M-C demand design and D1W independent security findings. Inspected actual
reservation service, authority transaction/receipt boundary, approval assertion,
reservation migration/witnesses, stock capacity trigger and adversarial fixtures;
existing reports were not treated as proof of current behavior.

## Implemented and blocked actions

| Action | Verified behavior |
| --- | --- |
| Create | Exact approved material demand, exclusive reservation source and held quantity commit together. |
| Adjust | Active exact revision only; increase opens only the delta, decrease releases only eligible held slices. |
| Cancel/release | Active exact revision only; untouched, unencumbered held remainder is released atomically. Terminal retries with a different key fail. |
| Lost response | Same capability/request returns its immutable original result without another mutation; current authentication and approval still apply. |
| Fulfill | Explicitly rejected before mutation; no legacy fallback. |
| Historical/unmapped reservation | Blocked, including release; lineage is not inferred from matching quantities. |
| Procurement/production/packing/delivery | Unintegrated roots cannot coexist with mapped reservation coverage in the activated isolated schema. No consumption transfer is enabled. |

Legacy service code still exists outside activation. In the activated schema,
runtime ACLs and deferred lineage witnesses reject its writes; this is not a
claim that every existing operational deployment has been cut over.

## Accounting and source ownership

`requirement_assert` locks the project and validates tenant, school, current
project revision and the exact approval snapshot. Material accounts bind tenant,
project, school, inventory item and canonical unit. Snapshot material lines supply
the entitlement; unrelated dimensions do not add capacity. Units must equal the
inventory canonical unit; conversions must already be frozen upstream.

For each account, `U = A - F - H >= 0`. Reservation creation/increase changes H
by the exact delta, decrease/cancellation releases H, and these actions leave F
unchanged. Four-decimal physical quantities are enforced before writing to the
six-decimal planning ledger. Subprecision and overflowing quantities fail.

Exclusive source identity includes reservation ID and revision slice. Reused
source slices and duplicate reservation IDs under different keys fail. Deferred
witnesses require live held claims to equal active reservation quantity, zero
reservation fulfillment, exact execution binding and consistent source ownership.
Unmatched direct release and direct consumption through the trusted ledger both
failed with all observed operational/ledger/receipt fingerprints unchanged.
Consumed, split, transferred or externally encumbered lineage cannot be presented
as an untouched reservation release; unintegrated external writers are blocked.

Approved demand does not create stock. The separate item lock/capacity trigger
continues to require verified physical coverage and sufficient physical balance
after other live reservations. Physical stock/ledger fingerprints did not change.

## Concurrency, atomicity and idempotency

Real PostgreSQL connections/transactions, not mocked races, verified:

- Two reservations competing for the last approved capacity: exactly one winner.
- Concurrent increases against the same revision: exactly one winner, one revision increment.
- Adjustment versus cancellation: exactly one winner.
- Concurrent identical release requests using one capability: identical result;
  a new-key repeat is rejected.
- Approval revision update holding a project row lock versus creation: observed
  PostgreSQL blocking, then stale approval rejection after the revision committed.
- Lost-response retry through a newly created authority/connection: same result,
  unchanged persisted fingerprints.
- Injected audit insert failure: reservation, binding, claim, source, event,
  balance and capability receipt effects roll back together.
- Unsupported claim consumption/unpaired release: deferred reservation witness
  rejects the transaction. Existing owner-injected projection sequence drift is
  rejected by hardening; the injection itself is rolled back.
- Existing serialization/deadlock cases preserve rollback plus explicit same-key
  caller retry; automatic retries are not claimed.

Project locks precede balance/source, item and reservation locks. Operation-key
serialization and immutable authorization receipts prevent duplicate allocation.
Reissuing a bearer for an already-used key does not replace the original receipt.

## Restricted-role security

The rerun D1W/D2A cases used the provisioned restricted runtime role. Legitimate
authenticated administrator reservations succeeded. Forged actor/tenant identities,
foreign administrator requests, school/unit/stale approval references, payload/key
substitution, ordinary access-token substitution, expired capabilities, revoked
sessions and role downgrades were rejected. Bound bearer reuse is permitted only
as the exact idempotent retry while the session and approval remain valid.

Runtime direct inserts into claims, source ownership, events, balances and
authorization receipts failed with PostgreSQL `42501`; reservation/projection
updates and binding insertion also failed. Direct privileged-function invocation,
forged session settings, temporary table/search-path shadowing, schema creation,
role escalation, unauthorized grants and trigger removal did not obtain authority.
The runtime role cannot execute `commitment_reservation_clean` directly. Pinned
function search paths and revoked PUBLIC execution survive recovery.

The database owner remains trusted and can disable triggers; these tests do not
claim protection from owner compromise. Existing identity-role SELECT exposure
and production connection/secret/TLS/startup provisioning remain deployment gates.

## Procurement isolation and D2B prerequisites

The reservation gate rejects historical procurement/downstream evidence; the
downstream gate serializes root writes against mapped reservations, including
terminal reservation mappings. Direct PR creation against the mapped project was
rejected. Existing approval enforcement and runtime restrictions remain active;
reservation coverage cannot be reused by an unintegrated PR/PO writer to mint a
second hold. Packing claims and reservation fulfillment remain blocked.

Isolated D2B may begin only as a separately authorized milestone. It must define:

1. Exact approved PR/PO line identity, frozen quantities/units and exclusive source
   ownership, including reservation-to-procurement transfer rather than a second hold.
2. Partial ordering/receipt/cancellation/release semantics conserving A/F/H/U;
   consumed or externally encumbered quantities must never be released.
3. Atomic operational records, events, audit, bindings and operation receipts,
   with concurrent revision/source races and lost-response retries tested.
4. Restricted-role adapters and narrowly scoped capabilities; no legacy fallback,
   broad grants or removal of fulfillment/packing/downstream gates.
5. Proven historical lineage, nonempty recovery/replay and reconciliation before
   any operational writer cutover. Unproven history remains blocked.

## Recovery and operational reconciliation

Fresh synthetic schema: `requirement_test_87b0a10ddbd2492b8dd7394355afa4e9`.
Reconciled approval/entitlements, balances, claims/source ownership, reservation
bindings, audit and immutable receipts. Independent event replay reproduced all
24 account projections from 69 events. A fresh nonempty dump/restore matched all
12 checked table fingerprints and preserved 11 pinned functions and deferred
reservation witnesses. Populated migration downgrade was refused.

[Fresh recovery fingerprints](MILESTONE_13M_D2A_R_FINGERPRINTS.json) retain only
synthetic review evidence. Runtime operations must reconcile active reservation
quantity against owned held claims, replay event projections, compare approval
bindings and inspect audit/receipt completeness; mismatches require a blocked
reconciliation case, not quantity-only repair or fabricated historical lineage.
Physical inventory, verification ledger and unrelated operational fingerprints
remained unchanged by the reservation tests. No real inventory was used.

## Fresh verification results

| Check | Result |
| --- | --- |
| Focused PostgreSQL approval/D1W/D2A suite | 37/37 passed, including added D2A-R adversarial assertions |
| Complete automated suite, two workers | 583/583 tests, 76/76 files passed (35.95 seconds) |
| Typecheck | Passed |
| Frontend, PWA and server build | Passed |
| Nonempty PostgreSQL dump/restore + replay | Passed: 12 tables, 24 accounts, 69 events, 11 pinned functions |

Initial sandbox attempts failed on Vitest temporary-file permissions and local
database access; required checks passed with reviewed elevated execution against
the isolated localhost test database. **No test timeout occurred in the fresh
full run.** The earlier documented packing-label timeout remains historical and
assertions/timeouts were not weakened. No production code/schema changes were
required; this checkpoint adds review tests, evidence and documentation only.

Stop after D2A-R. No deployment, main merge, force-push, D2B implementation,
operational cutover or downstream workflow activation is included.
