# 13M-D2B1 — isolated purchase-request commitments

2026-10-18. **CONDITIONAL PASS for isolated development only.** Baseline branch
`feature/kit-builder-milestone-1`, local/live remote start
`55507c706e33c04da4c005b74a28f10d702263b9`; only unrelated `AGENTS.md` dirty.
This slice implements a trusted server adapter and synthetic HTTP/PostgreSQL
acceptance boundary. It does not activate operational routes, startup migrations,
UI writers, historical records, PO creation/approval, receipts, QC or stock posting.

## Contract matrix

Every action requires a current tenant administrator, live session, operation-bound
D1V/D1W capability, explicit tenant-owned project/school/item, exact current approved
requirement revision and canonical inventory unit. PR and stable line UUIDs are
caller-supplied identities. One PR contains exactly one school/material line.

| Action | Preconditions | Atomic commitment effect |
| --- | --- | --- |
| Manual create | New PR and line identities; positive canonical quantity | Open only unclaimed U; draft revision 1 |
| Shortage create | Same; complete verified stock evidence; explicit amount no greater than uncovered school demand minus positive verified on-hand | Same hold; no reservation or inventory movement |
| Draft adjustment | Exact PR revision, immutable school/material/approval, untouched exclusive sources | Increase claims delta; decrease releases only owned H; increment revision |
| Review | Current draft | Reviewed; H unchanged; increment revision |
| Approve | Current reviewed PR | Approved; H unchanged; increment revision; no PO authority |
| Cancel | Current draft/reviewed/approved; proven clean downstream lineage | Release owned H, keep immutable source history; cancelled; increment revision |
| Other edits/transitions | Mixed/multiple lines, scope/unit conversion, historical or stale approval, transferred/consumed/encumbered sources | Blocked |

Shortage creation is bounded explicit sizing, not an automatic whole-project generator.
It conservatively subtracts verified global on-hand for that item from the school's
unclaimed capacity. It does not treat stock as approved entitlement or silently
deduct stock reservations again. School caps remain independent. The legacy bulk
line replacement and UI shortage writers are not activated.

## Source coverage and transaction boundary

`PurchaseRequestCommitmentService` shares the material account identity used by
reservations: tenant/project/school/material inventory item/canonical unit. Approval
snapshot material rows are summed exactly for that identity; there is no name or
quantity matching. Entitlement is the approved revision's cap, not an additive grant.
`U = A - F - H`; both PR and reservation holds consume the same H. Review and
approval create no new demand. Reservation coverage is neither reused nor transferred
in this slice: any PR hold must fit remaining U independently.

`commitment_pr_lines` immutably binds the stable line UUID to one PR, account,
entitlement, frozen canonical line and initial operation key. Claim source kind is
`purchase_request_line`, source ID is the stable line UUID, and opening slice is the
PR revision. Released identities cannot mint a fresh source. A genuinely new PR/line
may claim distinct remaining U; changing an idempotency key cannot reopen the same PR.

One trusted transaction locks project, balance, physical item and operational PR in
the reservation lock order. It checks current approval, lineage, status and revision,
then writes the PR, mapping, delta claim/events/projection, requirement binding,
supply audit and immutable capability receipt. Deferred witnesses require exact
frozen identity and PR quantity = exclusive held coverage (zero when cancelled),
with F=0 and no retired/parent/consumed sources. An audit failure rolls everything back.
Four decimal places and eight whole digits are accepted; zero, negative, exponent,
overflow and excess precision inputs fail. Planning arithmetic remains six-place
integer arithmetic, with conservative flooring when converting shortage capacity.

Same-capability lost-response retries return the atomic receipt only while the
capability remains valid (maximum 60 seconds), with current actor/session and approval
rechecked. A newly issued bearer with the used key fails closed; changed payload or
action fails scope checks. No claim of indefinite token recovery is made.

## Security, concurrency and defects

The restricted runtime cannot insert/update PRs, mappings, ledger sources/events,
balances or receipts, or invoke privileged ledger functions. The private ledger
pool receives the narrow PR permissions; startup boundary assertions inspect them.
Invoker functions pin search paths and revoke PUBLIC execution. Identity SELECT
exposure remains an earlier operational limitation, not resolved by this slice.

PostgreSQL tests cover authorized creation, tenant/approval/school/item substitution,
precision, stale revision, source reuse, same/different-key retries, conflicting
payload, logout and live role revocation, two PRs competing for final U, PR versus
reservation capacity, independent school caps, adjustment versus cancellation,
direct SQL and unsupported claim consumption/release. Rejected operations preserve
PR/claim/event/audit/receipt snapshots. Quantity adjustment cannot overwrite stale work.

Review found that a PO linked by `purchase_request_id` could omit planning lines
and escape the earlier project-line downstream gate. This activation now rejects
direct integrated PR references, including receipt-to-PO-to-PR references, and the
PR witness rejects existing linked POs even without planning lines. Regression tests
exercise both PO shapes and a rollback-only owner corruption fixture: receipt creation
and PR release certification remain blocked. Owner privileges are used only to build
that disposable fixture; restricted roles cannot disable triggers.

## Recovery and reconciliation

The activation migration accepts only `experimind_kitbuilder_test` and generated
`requirement_test_<32 hex>` schemas. It is not registered in server startup.
Existing migrations remain unchanged. Down migration intentionally fails: recovery
requires a verified backup restore and replay, not destructive removal of lineage.

Fresh synthetic recovery dumps a nonempty schema into a new schema, compares 14
ledger/PR/reservation/binding/audit table fingerprints, replays every account from
events and entitlements, checks 13 pinned functions, restored deferred witnesses and
the receipt gate, and rechecks every restored mapped PR. This proves nonempty
restore/replay, not production cutover readiness. Dump excludes role ownership/ACLs;
operators must reprovision restricted roles and assert boundaries before any use.

The attached fingerprint evidence separates authorized PR/supply-audit changes from
unchanged reservations, inventory items, stock ledger, physical verification,
production, packing, delivery and other downstream tables. No real inventory or
operational database was modified. Unmapped historical lineage remains blocked.

## Verification

- Focused PostgreSQL/HTTP suite: 37/37, including PR and reservation adversarial cases.
- Full regression: 583/583 across 76 files with one worker (77.99 seconds), including
  the final production changes. The later test-only corruption fixture extension
  passed in the final 37/37 focused rerun (23.04 seconds).
- Separate initial two-worker run: 582 passed; packing label test hit its existing
  5-second timeout. Isolated unchanged packing rerun passed 19/19. No assertions or
  timeouts were weakened; no functional packing change was made.
- Final typecheck and frontend/PWA/server builds: PASS. Existing bundle-size warnings
  remain; PWA precached 15 entries. No build warnings were suppressed or limits changed.
- Final nonempty restore/replay: PASS, 27 accounts, 83 events, 14 matching table
  fingerprints and 13 pinned functions. Restored PR witnesses and receipt gate pass.
- Initial extra corruption-fixture run failed on UUID/text parameter inference;
  explicit UUID casts fixed setup. Its final receipt and PR witness assertions pass.

See [fresh fingerprints and recovery evidence](MILESTONE_13M_D2B1_FINGERPRINTS.json).

## Remaining PO/receipt prerequisites and recommendation

The D2A-R prerequisites remain applicable: exact immutable source lineage, exclusive
coverage, transactional A/F/H/U, concurrency/retry safety, narrow trusted authority,
historical reconciliation and recovery. They do not conflict with the new bounded
authorization; this slice implements PR coverage only.

Further isolated PO work requires separate authorization and an explicit PR-line to
PO-line transfer contract, including partial quantities, cancellation, supersession,
source ownership and preventing a second H for the same coverage. Receipts/QC require
their own accepted/rejected/quarantined quantity accounting, immutable PO lineage,
physical stock posting authority, F transitions and rollback/retry tests. None is
implemented here. Historical records need proven lineage and operator reconciliation;
no automatic attachment, approval or release is allowed.

Before operational activation: independently review this slice; provision private
pools, keys, TLS, roles/ACLs and startup smoke checks; address identity SELECT
exposure, historical reconciliation and packing timeout reliability. Keep reservation
fulfillment and production/packing/delivery blocked. Recommendation: accept this
isolated PR slice conditionally; stop after D2B1. No deployment or writer cutover.
