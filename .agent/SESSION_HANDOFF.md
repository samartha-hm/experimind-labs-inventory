# Milestone 13M-D2A — 2026-10-18

Branch: feature/kit-builder-milestone-1.
Checkpoint a4c902349cb991e3e29a1ba19ab2d59e439b4024 pushed; full remote HEAD
matched. This separate continuity commit follows.

Verdict: CONDITIONAL PASS, isolated synthetic development only. Atomic reservation
create/adjust/untouched release/cancel share cumulative approved demand with
exclusive ledger H. Capability executor, immutable mapping/receipt, audit and
approval binding commit together. Runtime SQL and legacy reservation writes fail
closed. Fulfillment, historical attachment, unsupported transfers and downstream
roots remain blocked. No production HTTP adapter/pool.

Read docs/erp/ui-ux/MILESTONE_13M_D2A_RESERVATION_COMMITMENTS.md and fingerprints.
Changed: reservation service/migration, authority/database ACL boundary,
integration/HTTP checks, recovery runner and report/index.

Verification: focused PostgreSQL 37/37; idle two-worker suite 583/583 in 76 files;
typecheck and frontend/PWA/server builds PASS. Initial full run had two attachment
failures from TEMP inside source; external TEMP resolved them. Build-overlapping
rerun reproduced packing-label 5000ms timeout (582/583); idle full rerun passed.
No assertions/timeouts relaxed; reliability remains open.
Nonempty restore/replay PASS: 24 accounts, 65 events, 12 equal table fingerprints,
11 pinned functions and restored witnesses. Twenty unrelated operational tables
unchanged; only synthetic reservations/audit legitimately changed.

Next: user review of D2A acceptance. Stop before D2B/D3. Production activation,
downstream consumption lineage, historical reconciliation, staging roles/ACLs/
TLS/secrets/startup smoke and identity SELECT exposure remain open.
No deployment, main merge, UI expansion or company inventory changes.
Unrelated AGENTS.md remains uncommitted. Use /new or /compact.
