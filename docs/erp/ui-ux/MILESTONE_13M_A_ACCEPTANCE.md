# Milestone 13M-A backend acceptance — 2026-10-18

Implemented for separate backend review on `feature/kit-builder-milestone-1`.
No deployment, company data entry, main merge, or frontend approval workflow.
The user's explicit policy permits active tenant administrators to approve their
own saved requirements. Ordinary editors and managers cannot approve.

## Contract and evidence

[API contract and mutation inventory](MILESTONE_13M_A_BACKEND_CONTRACT.md)
describe the exact endpoints, permissions, immutable evidence and shared guards.
Approval is atomic across every school of one saved project revision. Its
immutable JSON snapshot retains saved content, per-school demand, Kit version
identity, packing assignments and conversion provenance, excluding live stock.
SHA-256 is reproducible from canonical JSON after PostgreSQL JSONB readback.
The actor comes from authentication and approval time from PostgreSQL.

One approval is retained per tenant/project/revision. Durable tenant/actor/key
mappings resolve an ambiguous response to the original result. Identical retries
recheck active administrator authority; concurrent different keys converge on
one approval. A new save makes earlier bindings ineligible for new execution,
while retained evidence and successful retry results remain readable.

## Verification and reconciliation

Focused real PostgreSQL acceptance: **11 tests passed**. Covers direct API tenant,
RBAC and malformed/stale input denial; empty/zero demand; duplicate and concurrent
approval; concurrent save versus approval; hash and actor/time attribution;
self-approval and demoted/disabled retry actors; immutable evidence; historical
execution; exact reservation/procurement/production/packing/delivery/lifecycle
bindings; supersession; completion exception bypass; and safe rollback refusal.

[Captured before/after fingerprints](MILESTONE_13M_A_FINGERPRINTS.json) retain row
counts and deterministic full-row MD5 comparisons for 22 operational tables:
inventory, ledger, physical stocktake/scopes/events, reservations, procurement,
supply audit, production parents/children, packing parents/picks, delivery claims
and custody, installation and completion. Migration up/down/up and approval both
leave every fingerprint identical. Approval adds exactly **one approval audit
row and two durable retry mappings**, with zero operational or binding writes.
Migration creates zero bindings for historical records.

Synthetic quantities preserve the existing calculator: approved wire demand is
3.3 m across two schools; packaging lines are accounted separately. Legacy item
quantities/prices and unknown-stock fields remain byte-equivalent. A verified
20 m count ends at 19.1 m only after the explicit approved 0.9 m packing pick.
The separate synthetic production input count and reservation do not change
wire stock. Approval and lifecycle operations post no ledger entries.

Final verification: all 76 test files / 557 tests pass, including the 11 focused
approval integration tests. Typecheck, frontend build, PWA generation and server
bundle pass. The frontend retains its existing large-chunk warning. Full-suite
verification uses two workers, a 30-second test timeout and a synthetic temporary
storage directory outside the application source tree; these settings resolve
earlier temporary-storage policy failures and packing-label test timeouts.
Evidence logs are local `.local-dev/13ma-focused.log`, `13ma-tests.log` and
`13ma-build.log`; the committed fingerprint artifact preserves the reconciliation.

## Implemented, blocked and recovery

New current-approved execution is supported through shared database transaction
guards on reservations, project procurement, production, packing, delivery,
installation and completion. Parent, child and ledger writes validate the exact
immutable binding; legacy global operational aliases retain their existing gate.
Unrelated stock operations and read-only planning retain existing behavior.

Historical execution is retained and readable, with no fictional approval
backfill. Historical or superseded transitions, installation/closure relying on
them, and changes to approved project-linked procurement lines are blocked.
Replacement requests are supported; reconciling existing allocations, receipts,
deliveries or closed projects requires a separate authorized business policy.
An exception reason cannot override these approval checks. This conservative
policy may interrupt in-flight workflows after migration or a later draft save.

Migration `1792368000013-AddRequirementApproval` is additive. Its empty rollback
round-trip passes; populated rollback refuses to erase evidence. Use a reviewed
forward repair once approval evidence exists. Do not roll the application back
to code that ignores these guards, disable triggers, or delete audit rows.

Remaining review risks: database trigger coverage is cross-cutting and merits
independent review before operational adoption; no historical reconciliation or
administrative override is authorized. Approval does not allocate aggregate
budgets or replace existing stock/quantity controls. No approval UI is enabled.
Stop after this backend milestone; UI integration requires separate review.
