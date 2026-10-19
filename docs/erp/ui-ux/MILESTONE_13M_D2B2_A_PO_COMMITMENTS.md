# Milestone 13M-D2B2-A — purchase order commitments

## Acceptance

**CONDITIONAL PASS**, 2026-10-19, isolated synthetic PostgreSQL only. Exact partial
PO coverage is represented safely without a second hold. Supplier settlement cannot
yet be proven: decrease, cancellation and return-to-PR are rejected atomically.
No operational activation, historical matching, UI, receipt/QC or stock integration.
Evidence: [fingerprints and races](MILESTONE_13M_D2B2_A_FINGERPRINTS.json).

## Prerequisites and existing behavior

The seven prerequisites in D2B1-R are applied as follows:

1. Immutable PR-to-PO mappings and exclusive partial source intervals now exist.
2. Unknown settlement/encumbrance blocks release; mutable status never releases H.
3. Existing private authority, signed operation capability, live identity checks and
   restricted SQL roles extend to POs; bypass probes run against real LOGIN roles.
4. Competing allocations, amendment/review, amendment/cancel, approval revision,
   retries, audit rollback and nonempty recovery are covered below.
5. Historical/ambiguous procurement remains quarantined, without automatic matching.
6. Receipt/QC, physical posting and reservation fulfillment remain separately gated.
7. Private production credentials, pools, TLS, keys, ACL/startup provisioning,
   identity SELECT exposure and packing reliability remain activation prerequisites.

The legacy SupplyPlanningService order path creates a PO from a PR and marks the PR
ordered; it cannot express safe exclusive partial coverage. That service remains
blocked for integrated PRs. The new private authority keeps the PR approved and
freezes its full row/revision after the first mapped PO. Multiple partial POs can
then reference the same approved source without changing its hold.

## Transition matrix

All permitted transitions require a live tenant admin/superadmin, an operation-bound
signed capability, current requirement approval, exact PR revision and lineage.
Each successful mutation writes its PO snapshot to supply_events atomically.

| Transition | Preconditions / result | Coverage and H |
|---|---|---|
| Create partial PO | Approved integrated PR; explicit live root claim/slice; tenant supplier; new PO ID | Append exact unused intervals; H unchanged |
| Increase | Draft, unreviewed PO; exact PO revision; additional explicit source capacity | Append intervals only; H unchanged |
| Review | Draft, unreviewed; exact revision | No allocation or ledger change |
| Approve | Draft, reviewed; exact revision | Final approved PO; no allocation or ledger change |
| Decrease / cancel / return-to-PR | Settlement proof unavailable | Reject; no release, audit or state change |
| Amend reviewed/approved PO | No supported safe amendment contract | Reject |
| Change supplier, source or frozen metadata | Frozen exact binding | Reject |
| Receipt / QC / physical posting | Separate integration absent | Block; PO approval grants no downstream permission |
| Legacy or ambiguous planned PO | No exact integrated mapping | Quarantine/reject; no matching or activation |

## Lineage, quantities and conservation

Lineage is current approval → demand account → entitlement → immutable PR line →
live root PR claim/source slice → PO mapping → exclusive source interval.
The PO line inherits the PR line UUID; its identity is the pair (PO ID, line UUID).
This milestone supports exactly one frozen planning line per mapped PO. Tenant,
project, site, item, unit, approval, PR revision and conversion metadata must match.
Quantity and canonical quantity are equal; quantities use exact four-decimal stock
units without rounding. Whole frozen PR and PO snapshots protect other metadata.

Each coverage interval [start,end) belongs to one claim and one PO. Intervals cannot
overlap across POs; their sum must equal that PO's canonical quantity and stay within
the live unfulfilled PR hold. Both mapping and coverage rows are append-only.

The demand invariant remains A >= F + H, with U = A - F - H. H includes reservation
and PR root commitments; PO coverage is a subset of PR H, never an additional hold.
PR unordered coverage = PR H minus allocated PO intervals. Unordered coverage also
stays held after a PO is linked; no speculative settlement release occurs.
The proof records shared A/F/H/U, claim allocation totals and unchanged hashes of
accounts, entitlements, balances, claims, sources and immutable ledger events.

## Transactions and authority

Lock order is project/current approval → account balance → physical item → PR → PO
→ sorted source claims. The project lock serializes approval revision changes;
balance and claim locks serialize PR/reservation demand and competing PO allocation.
PO revisions prevent stale review or amendment. A changed requirement approval
invalidates new operations and retries, including a previously issued capability.

The existing trusted transaction runner binds key and full payload fingerprint,
checks live role/tenant/revocation and retries its supported transient transaction
failures. Lost-response replay returns the same result without duplicate coverage
or audit rows. Changed payload/key and another capability for an existing key fail.
Audit failure rolls back PO, mapping, coverage and authorization state together.

Runtime and identity roles cannot mutate PO/mapping/coverage tables. The private
ledger writer gets the required narrowly enumerated access. Deferred invoker
witnesses enforce exact frozen lineage, quantity equality and nonoverlap even for
direct writer SQL. Functions pin search_path and revoke PUBLIC execution.
The migration is explicit and limited to the synthetic test database/schema;
neither entities nor migration are registered for production startup.

The former one-PO-per-PR constraint becomes a unique index for unplanned legacy
POs only. Every new planned PO requires the exact deferred mapping witness.
The legacy planning-line immutability gate permits mapped PO updates solely under
the new frozen-metadata/coverage witness; header/vendor guards remain enforced.
Rollback requires restoring the pre-migration backup, rather than dropping proof.

## Verification and limits

- Focused PostgreSQL/HTTP suite: **37/37 passed**. The full run also passed the final
  PO reconciliation assertions added after that focused run.
- Full suite: **582 passed, 1 failed** across 76 files. The unchanged packing-label
  print/reprint test hit its existing 5000ms timeout. Isolated retry: **19/19 passed**.
  No timeout or assertion was relaxed; packing reliability remains open.
- Typecheck: PASS. Frontend, PWA and server builds: PASS; existing large-chunk warning.
- Nonempty backup/restore/replay: PASS; **17 table fingerprints**, **28 accounts**,
  **86 events**, **15 pinned functions**; deferred witnesses restored and checked.
- Two competing partial POs: one winner for remaining capacity. Increase/review:
  one winner at a shared revision. Increase/cancel: increase succeeds, unsafe cancel
  rejects. Approval revision race serializes, and stale operations/retries reject.
- Explicit bad source/slice, stale PR, wrong site/tenant, precision, supplier,
  unreviewed approval, reviewed amendment, forged capability, key/payload replay,
  live role change, revocation, legacy service, HTTP and restricted SQL probes reject.
- Owner SQL overlap, frozen metadata/status changes and supplier receipt inserts
  reject. Forced audit failure preserves all captured fingerprints.
- PO operations preserve all six core ledger fingerprints and unrelated operational
  tables, including stock, receipt/QC, reservations, production, packing and delivery.

Initial implementation checks exposed the legacy one-PO uniqueness and immutable
planning-line guard; both were resolved through the exact mapping/witness contract
above and the complete focused run passed afterward. The local synthetic database
was restarted for verification. These checks do not prove production provisioning,
arbitrary historical data compatibility or supplier settlement semantics.

## D2B2-B prerequisites — separate authorization required

Define exact receipt source identity, frozen PO/PR/claim lineage, canonical units and
conversion, cumulative receipt cap and idempotent receipt keys before enabling any
receipt endpoint. Specify physical posting and F/H transitions, QC accepted,
rejected and quarantined quantities, reversals and supplier settlement evidence.
Prove that rejected/returned goods cannot silently reuse source coverage or release
H. Establish safe decrease/cancel/return-to-PR terminal rules from that evidence.

Extend the private authority, SQL witnesses and live approval checks; test receipt
competition, cancellation races, audit failure, lost responses and nonempty restore.
Resolve production private-pool/credential/TLS/key/role/ACL/startup provisioning and
identity SELECT debt before activation. Keep the intermittent packing-label issue
tracked separately. Stop after D2B2-A; no supplier-receipt work is authorized here.
