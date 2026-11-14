# Milestone 13M-D1 — Shadow verification

The shadow service is internal and read-only: a PostgreSQL REPEATABLE READ, READ ONLY transaction with
current tenant-administrator checks. Its output says **DIAGNOSTIC ONLY — grants no execution rights**.
It reads tenant reservations, PRs, POs, production work orders, packing orders and delivery orders alongside
ledger balances/claims. It writes neither mappings nor reconciliation cases and grants no approval.

Existing synthetic operational records have no fabricated ledger lineage. The comparison reports
`missing_source_lineage` and `historical_reconciliation_required`; an explicit mapping to an unknown claim
reports `unproven_or_mismatched_lineage`, and repeated explicit mappings report `potential_duplicate_commitment`.
Tests verify those outcomes, repeated-snapshot evidence-hash stability, foreign-tenant absence, staff denial
and unchanged operational fingerprints. Fingerprint evidence appears in [acceptance](MILESTONE_13M_D1_ACCEPTANCE.md).

Caller mappings are diagnostic hypotheses. Identity checks require matching project/site and, for reservations,
material dimension/item; quantity comparison requires exact decimal text and matching unit. Reservation numeric
values are selected as text. Orders with embedded lines/packages require a future evidence adapter and receive
`quantity_requires_manual_evidence`. Supported diagnostic branches also include `inconsistent_quantity`,
`approval_cap_deficit` and `unresolved_explicit_link`; the current real-record scenarios do not establish
source-specific quantity/cap reconciliation coverage for every order type.

The evidence SHA-256 covers ordered records, claims, balances and the supplied hypotheses using canonical JSON.
It is a reproducibility marker, not independent proof of physical truth. There is no fuzzy association by
name/item/quantity, no historical activation, and no stock/reservation/order/package mutation.

Missing lineage is an expected unresolved finding at this foundation stage. Independent review and concrete
source evidence adapters are required before shadow findings can support any consequential integration.

Final snapshot: 10 operational records; 10 missing-lineage and 10 historical-reconciliation diagnostics.
Evidence SHA-256: `48da41c6861329e33ae9116bddd83b9d2838a8f5a6da24f773c65652992611f7`.
