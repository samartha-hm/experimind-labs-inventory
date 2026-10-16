# Milestone 13I acceptance — 2026-10-16

PASS for bounded inspection evidence and rejection. Final acceptance/readiness,
dispatch and further operational integration remain blocked for review.
See [the transition matrix](MILESTONE_13I_CONTRACT_MATRIX.md).

## Implemented boundary

Package-specific six-check pass/fail/pending evidence, inspector UUID/time,
reason and snapshot provenance accompany the existing scan-first workspace.
Authorized inspectors can submit one-package rejection with six explicit results,
reason, identity/revision review and acknowledgment. Existing packing correction
and reassembly remain available under their original permissions. Unsaved results
are not persisted inspections; checklist progress is never QC acceptance.

The rejection adapter reuses PackingService.qc and additionally protects accepted
targets/ancestors inside the revision-locked transaction. Current role checks
precede idempotent replay. Tenant scoping, exact intent replay and audit snapshots
remain authoritative. No new schema, stock calculations or inventory movements.
Final acceptance is disabled because the existing contract can change order status
to ready. Partial inspection drafts, accepted-package reopen, legacy QMS/RMA and
signature mutations have no supported integration here.

## Verification

- Full isolated PostgreSQL suite: **532/532 tests, 73 files** (39.08 seconds).
  Focused checks: 26 tests across three files. Typecheck and frontend, PWA and
  server builds pass. Scripts pass Node syntax checks; Git whitespace check passes.
- API tests cover unauthorized/tenant denial, malformed checks/reasons, blocked
  acceptance, accepted revision protection, stale version, changed-payload key
  collision, exact replay and two authorized inspectors racing on one revision:
  exactly one 200 and one 409. Existing requirement snapshots stay unchanged.
- Authenticated browser: Enter-based package scan; blank-check preparation blocked;
  all six results plus reason reviewed; acknowledgment required. A real committed
  rejection response was intentionally lost through the loopback test proxy.
  Reload retained the exact intent; replay confirmed revision 5 without duplication.
  Second rejection saved revision 6; another tab refreshed to revision 6. Repeated
  scanner lookup did not mutate data. Snapshot reasons/actors/inspectors verified.
- Browser-injected 403 and 409 responses retained the pending intent, disabled
  automatic retry and displayed reconciliation instructions without false success.
  These requests were not forwarded; backend denial/races are independently tested.
- Scoped axe WCAG 2 A/AA, WCAG 2.1 AA and best-practice audits: desktop 1280x720
  and tablet frame 768x1024 each **zero violations, zero incomplete, 26 passes**.
  Tablet body scroll width 753 at viewport 768; keyboard lookup and audit work.
  Native viewport override did not apply, so tablet acceptance uses a fixed-width
  same-origin frame. This is browser responsive testing, not physical tablet testing.
- Browser harness initially stalled with accumulated SSE tabs, cache and development
  websocket errors. Closing synthetic tabs and using an uncached harness entry
  recovered the checks. A frame pointer-click failed; keyboard Enter succeeded.

## Operational reconciliation and rollback

Synthetic order c8776479-6131-456e-b7ff-9ba6f82ca018, package
bf21c71a-8a93-4bfa-9a3d-ddbee935103a: baseline revision/history 4/4;
after two authorized rejections **6/6**. Both events have the correct inspector
and actor; material fails, other checks pass. Exceptions, immutable snapshot and
all unrelated order fields are unchanged. Order stays packing; package stays
assembled and rejected. Fixture release/picking/assembly occurred before baseline.

Fourteen complete table row counts/content hashes remain equal: inventory_items,
stock_ledger, project_stock_reservations, packing_picks, planning_projects,
planning_sites, product_template_versions, production_work_orders,
production_input_reservations, production_input_issues, production_batches,
production_qc_decisions, delivery_orders and delivery_package_claims.
No duplicate deductions, reservations, readiness or dispatch changes occurred.

Legacy remains default. Both workspace flags off on the temporary server:
workspace unavailable, legacy detail exactly equals the verified saved detail,
all fourteen fingerprints still equal, revision/history still 6/6. No migration
or data conversion. Production defaults remain disabled.

## Reproducible evidence and limits

Ignored local evidence: `.local-dev/13i-{full-suite,typecheck,build}.log` and
`.local-dev/ux-13i/{reconciliation,verified}.json`, screenshots `desktop.png`,
`tablet.png`, `conflict.png`. Evidence contains synthetic data and is not committed.
The loopback-only `scripts/packing-inspection-test-proxy.mjs` supplies fault and
audit harnesses; it requires the existing local axe asset. The guarded
`scripts/validate-packing-inspection.mjs` supports setup/verify/rollback against
only isolated PostgreSQL port 55432; setup creates a new synthetic fixture.
Browser actions run separately. Never run setup against company data.

Physical scanner, printer, tablet, staff, screen-reader/assistive-device and actual
zoom acceptance remain pending. History is at most 100 order snapshots, not a full
inspection-attempt log. Pending recovery is actor/sessionStorage scoped; after
session loss, reconcile server history before preparing a new intent.
Stop for review before acceptance/readiness, dispatch or further write integration.
