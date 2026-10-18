# Milestone 13M-D1 — Central commitment ledger foundation

Status: implemented for isolated synthetic verification; independent review required before writer integration.
Baseline: `52dd7c48847d6d747ef885129ed384da78c6babc`. Branch: `feature/kit-builder-milestone-1`.
Contract: [13M-C design](MILESTONE_13M_C_DEMAND_AND_RECONCILIATION_DESIGN.md).

## Schema and authority

Migration `1792540800015-AddCommitmentLedger` adds seven tables, registered with TypeORM in `src/db.ts`.
It creates no operational triggers, endpoints, background jobs, UI or historical backfill.

| Table | Purpose and protection |
| --- | --- |
| commitment_accounts | Immutable tenant/project/school demand identity; unique obligation and dimension/item/unit identity per school |
| commitment_entitlements | Immutable approval/revision/cap/provenance, checked against the frozen approval snapshot |
| commitment_events | Append-only actor/reason/payload audit; tenant/actor/idempotency key and account/sequence uniqueness |
| commitment_balances | Transactional A/F/H projection; only event/account triggers may write it |
| commitment_claims | Exclusive live or retired root/child slices; tenant/account foreign keys and quantity conservation |
| commitment_sources | Immutable forever-occupied source identities, including sources transferred away from a claim |
| commitment_reconciliation_cases | Immutable evidence/hash metadata; `active=false` enforced by CHECK |

Composite foreign keys bind accounts, entitlements, claims, roots and sources to one tenant and account.
Account creation verifies the school's tenant/project. Material entitlement caps aggregate matching frozen
logical material lines at that school/item/canonical unit; the full sorted lines remain provenance.
Grade slots use the approved selection's explicit grade quantities. Crate slots use the approved expanded
crate owner line. Grade and crate selectors are mutually exclusive; all slots require integers.
Science grade/common/universal and independent Maths fixtures exercise these selectors. Existing expansion
still owns complete-set allocation and frozen conversions; this milestone changes neither expansion nor packing.
Shared material is aggregated once from its existing approved lines, never re-expanded by execution stage.

## Conservation and exact quantities

`A = approved total-to-date cap`, `F = irreversible fulfilled`, `H = live exclusive holds`, `U = A-F-H`.
Every committed event preserves `A >= F+H`, `F >= 0`, `H >= 0`.

| Operation | Effect |
| --- | --- |
| authorize | Set A from a strictly newer immutable entitlement; reject cap below F+H; retain F/H |
| open | H += quantity, bounded by U; establish a root claim and unused synthetic source identity |
| transfer | Move source identity on the same claim; retain old source occupancy and preserve F/H |
| consume | H -= quantity; F += quantity; cannot consume retired or released quantity |
| release | H -= eligible remainder; require explicit untouched/unencumbered evidence; never reduce F |
| split | Retire an untouched parent and partition its entire H among at least two disjoint child identities, including explicit remainder; preserve aggregate H |

Decimal strings use six-place planning precision, nonnegative values and a 1,000,000,000 upper bound.
`planningUnits` uses bigint. `planningStock` delegates to existing stock utilities after checking exact
four-place representability. Material consumption also enforces stock range and precision in PostgreSQL;
there is no rounding. Physical stock is never written by these operations.

Release evidence and source slice names are synthetic declarations, not verified operational settlement
or physical interval proofs. Database identity uniqueness and full quantity partitioning enforce the
foundation's algebra. Real source adapters must prove physical exclusivity before connecting writers.
There is no resource-loss, recipe/rework, historical activation or additional approval authority.

## Transactions, retries and security assessment

Service calls require a currently active same-tenant administrator. Event INSERT independently rechecks
that actor in PostgreSQL and invokes existing `requirement_assert` for exact current approval/revision/site,
including stale/closed/archived guards. All SQL values use parameters; dynamic shadow table names come from
a fixed internal allowlist. No dependencies were added.

Service lock order: actor FOR SHARE, tenant/actor/key transaction advisory lock, project lock through
`requirement_assert`, balance FOR UPDATE, claim FOR UPDATE. Each operation touches one account.
The project lock also serializes direct event inserts against approval changes. Unique constraints remain
the final duplicate barrier. Future multi-account writers need an explicit globally ordered locking protocol.
An outer transaction can atomically encompass execution through `executeInTransaction` once integration
is separately reviewed; injected failure currently demonstrates complete rollback of event/claim/source/balance.

Same-key retries compare account, entitlement, operation, canonical JSON payload and reason. Equal concurrent
requests return one retained event; conflicting reuse fails. Retry rechecks current actor and approval guards.
Independent bigint replay derives A from immutable entitlements and F/H from events, verifies every sequence
and after-state, and is compared with both balances and aggregate claim quantities.

Immutable tables reject UPDATE/DELETE and all seven tables reject TRUNCATE. Projection tables reject direct
SQL writes outside nested ledger triggers. Tests exercise SQL tampering without bypassing protections.
This is not protection against a schema owner/superuser disabling or creating triggers: production integration
must review least-privilege database roles, DDL ownership and search_path. Internal service context is trusted
application identity; there is no new HTTP surface or RLS claim. Shadow results are admin-only and tenant-scoped.

## Migration and rollback procedure

1. For a separately authorized environment, preserve a backup and verify tenant/project/approval prerequisite
   migrations, current schema, migration history and application/database role permissions. Do not use synchronize.
2. Apply the additive migration through the existing migration runner in a transaction. No operational rows
   are updated and no accounts/entitlements/claims are seeded. Keep all existing execution writers unchanged.
3. Check the seven structures and triggers, verify operational fingerprints and run synthetic checks.
4. Before any downgrade, preserve evidence and stop all ledger callers. Run `down` in a transaction.
   It acquires ACCESS EXCLUSIVE locks on all seven tables and requires every table to be empty before dropping
   its structures/functions. Any retained account, claim, event or reconciliation metadata refuses downgrade.
5. If any ledger evidence exists, retain it and use a reviewed forward migration/recovery procedure. Never
   delete evidence to satisfy the empty check. Roll back the failed downgrade transaction.

Verified only on isolated synthetic PostgreSQL: up/down/up with empty prerequisite table definitions cloned
from the test schema (no operational rows), then up/down/up against populated synthetic operational tables.
The empty-schema test rolls back its entire schema transaction. A populated-ledger downgrade is refused.
No deployment or migration against company data occurred.

## Follow-up plan — requires independent review first

1. Review account granularity, revision compatibility and carry-forward mapping for changed versions,
   conversions, kit allocations and existing F/H; fail closed on unresolved structural changes.
2. Define source-specific reservation/PR/PO/WO/package/delivery lineage, physical slice exclusivity,
   draft-hold lifecycle, cancellation/encumbrance proof and irreversible consumption boundaries.
3. Define historical evidence review and immutable mappings, current authorization overlays, administrator
   controls and any two-person review requirement. Inactive metadata cannot activate history.
4. Connect one consequential writer at a time in its existing transaction, preserving 13M-B security and
   packing guards; verify mixed-stage races, retry identity and rollback with real PostgreSQL.
5. Add source-specific shadow adapters and reviewed reconciliation before any cutover or user-facing surface.

Whole-site packing remains the only operational assumption. Partial ledger slices confer no partial packing
permission. No reservations, procurement, production, packing or delivery writer is connected by D1.
