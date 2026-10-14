# ERP state — 2026-10-14

Branch: feature/kit-builder-milestone-1. Milestones 1–6 implemented. Milestone 6 implementation checkpoint cada29a15c42523774321c13d5c0b758b0257619 pushed and remote verified; starts from 2de85da9bd42df744c8c44388d73ca906e888767.

Approved tenant stocktakes establish physical balances in the existing PostgreSQL stock_ledger. Immutable provenance/revisions, role approval, exact decimal/unit conversion, sorted locks and idempotent posting protect stock. Legacy item names/descriptions/quantities/prices/locations and historical ledger records remain untouched and unverified. Missing or partial coverage never becomes zero.

Multi-school requirement previews compare gross demand with verified ledger stock and unreserved availability. Immediate shortage is calculated only for verified compatible units. Reservations/incoming/projected shortage remain Not configured/null; operational release is blocked. Preview does not change stock or project/template snapshots. See ADR-025 and docs/erp/30_INVENTORY_FOUNDATION_RUNBOOK.md.

Additive migration 1791504000003 applied only to the isolated development database. Empty rollback/reapply and populated rollback refusal verified. No database reset, company-data import, procurement, production or deployment.

Focused 41 tests and full 397 tests/54 files PASS; typecheck and frontend/PWA/server builds PASS. Real authenticated development stocktake post/retry/reopen and project preview PASS: 3.3 m gross, 2 m verified, 1.3 m shortage. Recalculation preserves ledger and legacy inventory. Browser acceptance remains PENDING due to bootstrap EPERM; existing bundle-size warning remains.

Stop for review. Use /new or /compact before further work; no subsequent milestone, merge or deployment authorized.
