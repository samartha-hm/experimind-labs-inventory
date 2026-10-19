# Milestone 13M-D2B2-B — supplier receipt and incoming QC contract

Date: 2026-10-19. Baseline: `045c479f5deba1514e565fb3139b4590cd6eef92`,
branch `feature/kit-builder-milestone-1`. Synthetic isolated PostgreSQL only.
This document preserves the original design contract below. The recovery update
supersedes its descriptions of the current implementation. Operational activation
is not authorized.

## D2B2-B-S closure update

The [B-S report](MILESTONE_13M_D2B2_B_S_FALLBACK_AND_RECOVERY.md) supersedes
the historical B-R status below. Receipt and QC routes now fail closed without
the guarded authority; legacy service and generic stock entry paths also refuse.
Restricted authenticated HTTP survives clean PostgreSQL restart and nonempty
fresh-database restore with role reprovisioning and unchanged demand commitments.
This remains isolated synthetic proof; operational activation is not authorized.

## Historical D2B2-B-R recovery update — BLOCKED

Migration 21, `ReceiptCommitmentService` and the private authority now implement
synthetic receipt coverage and explicit QC with reciprocal deferred witnesses.
The production supply-planning router accepts strict operation-bound payloads and
binds the capability to the access-token session. An optional separate ledger
connection is wired at startup only for the isolated localhost synthetic target.
The alternate purchase-order receive route returns 503.

Actual router HTTP evidence covers pending receive, quarantine, concurrent accept,
same-capability retry, malformed/substituted requests, session substitution,
revoked-session retry and an injected audit failure with unchanged snapshots.
Acceptance posts one stock movement; receipt/QC leaves commitment A/F/H/U unchanged.
Rejected and quarantined quantities retain received coverage.

These changes do **not** establish acceptance: without migration 21 and a supplied
authority the supply router retains its legacy receive/inspect implementation.
That path includes automatic acceptance for non-QC lines. Universal fail-closed
routing, the complete adversarial matrix, process restart and restricted-role
post-restore HTTP continuity remain unproved. No public capability issuance/client
flow or whole-server startup acceptance test was added. The full suite also retains
one packing-label timeout. Do not activate or accept this partial implementation.

Nonempty backup/restore matches 22 table fingerprints and replays 28 accounts/86
events, with 17 pinned functions and restored receipt witnesses. This proves fresh
connection reconciliation, not PostgreSQL process restart or restored runtime ACLs.
Populated rollback remains unsupported and must preserve all evidence.

See [recovery report](MILESTONE_13M_D2B2_B_R_RECOVERY_REPORT.md) for exact results,
recovery prerequisites and unresolved acceptance gates.

## Original design and pre-recovery assessment

## Review prerequisites

D2B2-A-R requires exact PO/PR source interval identity; historical/ambiguous lineage
rejection; cumulative receipt and QC ownership caps under concurrent retries;
defined H/F/U transitions without another commitment; explicit supplier-QC ownership
and return/reversal semantics; live private authorization; atomic audit; rollback,
replay, restore and operational reconciliation evidence. These agree with this
authorization. Returns/reversals have no supported authority and remain blocked.

## Transition matrix

| Transition | Required proof and intended result | Current integrated contract |
|---|---|---|
| Create receipt | Current approved PO/revision and exact line; exclusive unused PO source intervals; canonical exact quantity; declared verified location; live tenant actor. Create pending evidence, retain H, no stock/F change | Blocked by PR receipt gate and PO witness |
| Partial receiving | Append disjoint intervals within each immutable PO coverage slice; serialize outstanding quantity and PO changes; all statuses consume received coverage | No receipt-to-coverage mapping exists; blocked |
| QC accept | Pending/quarantined receipt; exact revision and frozen source; explicit inspector; one atomic stock movement, QC snapshot, audit and retry result | Private authority has no receipt/QC action or stock INSERT permission; blocked |
| QC reject | Pending/quarantined receipt; inspector/reason; retain received coverage and H; no usable stock or replacement entitlement | Integrated receipt creation blocked; no safe integrated QC transition |
| Quarantine | Pending receipt; inspector/reason; retain coverage/H; no usable stock. Acceptance requires subsequent explicit QC action | Integrated receipt creation blocked |
| Duplicate posting | Same operation capability/key/payload returns committed result; changed payload or capability conflicts; finalized receipt cannot post again | Existing authority semantics apply to PO only; receipt proof absent |
| Cancel/decrease/return-to-PR | Affirmative supplier/financial settlement, exact downstream release, serialized compensating evidence | Blocked; missing receipt rows are insufficient |
| Return/reversal/replacement | Separately approved disposition and compensation contract | Blocked; no new entitlement or hidden stock correction |

## Source lineage and accounting

Current approval/revision → material account/entitlement → frozen approved PR
revision/line → live unretired root claim and source slice → immutable PO mapping
→ exclusive half-open PO interval. A future receipt must reference that interval's
UUID and an exclusive contained subinterval, preserving tenant, project, school,
item, unit, approval, revisions and frozen conversion metadata. Names, quantities,
matching item IDs or JSON source metadata alone do not prove coverage ownership.

Receiving, pending/quarantined QC, acceptance and rejection all retain existing PR
H. Accepted supply is physical stock, not school fulfillment F. Therefore A, F, H
and U must remain byte-for-byte unchanged by these transitions. Rejected quantities
continue to consume received coverage; rejection does not authorize re-receiving.

## Existing barriers and missing proof

Migration 19 installs `a_d2_pr_receipt_gate` on receipt INSERT/UPDATE for integrated
PR ancestry. Migration 20's `commitment_po_check` also rejects any receipt belonging
to a mapped PO. Neither barrier may simply be removed.

`SupplyPlanningService.receive` locks PO and item, checks aggregate received quantity
and canonical conversion, creates pending evidence and automatically accepts lines
whose frozen `qc_required` is false. Its existing source JSON stores conversion
metadata, not exclusive PO coverage. `inspect` locks PO/receipt and changes QC state;
acceptance invokes `postVerifiedSupplyMovement` in the same transaction. These are
legacy contracts, not proof of integrated source ownership.

The stock helper requires an already counted declared location, writes an immutable
movement with receipt UUID, actor, item, unit, location and sequence, and does not
change legacy inventory balances. Existing uniqueness/ownership checks alone do
not establish integrated receipt coverage or a deferred reciprocal QC/stock witness.
Opening-balance and stocktake rules must remain unchanged.

`TrustedLedgerAuthority` supports PO, PR and reservation mutations, not receipt/QC.
Restricted ledger SQL can SELECT receipts/stock but cannot INSERT either. Runtime
SQL must not gain authority over integrated receipts or their stock entries.

## Additive migration preservation and rollback plan

AGENTS.md requires an explicit migration task for schema changes. Before opening
any transition, authorize an additive migration for append-only receipt coverage,
immutable QC transition evidence, deferred reciprocal source/QC/stock witnesses,
and restricted ACL/startup assertions. Keep all historical rows untouched and
unmapped; preserve existing guards for every unsupported path. No backfill,
name-based matching or historical activation is permitted.

Test migrations only in newly created synthetic schemas. Empty-schema rollback
may restore exact prior function definitions and ACLs. Populated rollback must
fail closed: never drop receipt/QC evidence or reverse posted stock implicitly.
Application rollback must close mutation entrypoints while retaining the new
schema/evidence; posted physical corrections require separate authority.

## Acceptance gate

No implementation PASS is possible until restricted HTTP/service/SQL, source
substitution, partial/racing receipts, duplicate/racing acceptance, revocation,
lost-response retry, PO-change races and write-stage rollback tests establish the
above proof. Record operational fingerprints, individual expected deltas and a
nonempty restore with stock/source reconciliation and ledger replay. A blocked
transition test is evidence of containment only, not successful receiving or QC.
