# D5 consolidated ERP readiness and pilot gate

Date: 2026-10-22. Branch: `feature/kit-builder-milestone-1`.
Baseline: `525dc81dad7709ec4abb09817d2c152dd20abd15` (D4).

**Verdict: BLOCKED for complete D5 software acceptance and operational pilot.**
The implemented read-only historical discovery slice passes its automated checks.
This is not acceptance of historical reconciliation decisions, a whole-application
authenticated workflow, or operational cutover. D1–D4 services remain the baseline.

## Workflow coverage and evidence limits

| Module/workflow | Current supported evidence | D5 gap/gate |
| --- | --- | --- |
| Dashboard, navigation, project management | Existing integrated application; automated regressions | Whole-app authenticated navigation and accessibility acceptance outstanding |
| Catalog, kit builder, recipes, Science/Math | Existing independent selections and recipe/quantity regressions pass | Staff review of published recipes and actual approved school selections |
| Multi-school demand and approval | Existing cumulative approval, entitlement and tenant/security regressions pass | No new single consolidated multi-school browser scenario or full-lifecycle reconciliation report |
| Inventory and stocktake | Stocktake regressions pass; historical master quantity remains distinct from verified counts | Physical complete-location counts, unit validation and signed opening balances NOT PERFORMED |
| Reservations, shortages, PR/PO, receiving QC | Existing commitment, exclusive coverage, receipt/QC and retry suites pass | Real supplier/receiving workflows and deployment-role configuration outstanding |
| Production and material issue | Existing recipe entitlement, physical issue and output custody suites pass | Staff/device trial and real material mapping NOT PERFORMED |
| Packing and six-check QC | Existing conserved allocations, QC, concurrency and QR/PDF suites pass | Actual label printer, scanner and packing staff acceptance NOT PERFORMED |
| Dispatch and partial delivery | Existing D4 exclusive custody, partial fulfillment and exact-retry suites pass | Physical multi-school dispatch and acknowledgments NOT PERFORMED |
| Installation and school closure | Existing D4 installation/closure and immutable evidence suites pass | Actual site evidence, staff signoff and business closure review NOT PERFORMED |
| Historical reconciliation | New admin-only, tenant-scoped read-only preview/export in Inventory | Append-only decisions, disputes, authoritative lineage graph, CAS/idempotent decision writes and activation remain unimplemented/disabled |
| Legacy QMS/RMA/e-signature | Existing restrictions retained | Blocked; no reopening authorized |

Prior milestone evidence: [D3 acceptance](ui-ux/D3_COMPLETION_ACCEPTANCE.md),
[D4 acceptance](ui-ux/D4_DISPATCH_DELIVERY_CLOSURE_ACCEPTANCE.md).
These explain supported contracts; they do not count as newly performed D5
browser, physical or recovery checks.

## Implemented reconciliation and UI controls

Inventory now includes **Historical reconciliation review** for active tenant
administrators. `GET /api/v1/stocktakes/reconciliation` supports seven fixed
sources: inventory items, project stock reservations, purchase requests/orders,
production work orders, packing orders and delivery orders. Responses contain
50 records, next-page indication, preserved lifecycle status, raw source
provenance, decimal quantity strings, explicit blockers, row/page SHA-256 hashes,
and unchanged stock/commitment/custody/fulfillment effects. Exports cover one page.

The endpoint performs a repeatable-read, read-only transaction, checks the
current active administrator in the database, filters organization, validates
source/offset and disables caching. Missing source tables return an explicit
incomplete-schema error. Authentication, forged role claims, inactive users,
cross-tenant visibility, unsupported source/query shapes and unchanged inventory
are covered by the new integration test.

The integrated panel provides loading, error, empty and offline explanations,
explicit refresh, disabled controls during requests, previous/next pages,
keyboard focus styling, 44px controls, live status and expandable provenance.
Source changes discard the old preview. It follows the existing operational
panel styling; this is a targeted improvement, not a completed design-system audit.

**Classification is intentionally conservative:** inventory is unknown; execution
rows are unreconciled. Verified/disputed classifications are not inferred.
Verified historical quantity is null, never zero. Posted stocktake availability
remains a separate authority. The preview includes all tenant rows from the
selected source; it does not yet identify only historical/unlinked rows or join
the complete authoritative lineage graph. Hashes identify exported evidence,
not approval, signatures, durable audit decisions or a concurrency contract.
No reconciliation POST/activation path, schema change, stock correction or
historical school-demand approval was introduced.

Required next implementation: lineage/conflict analysis against authoritative
accounts and source links, explicit evidence references, verified/unknown/disputed
states, append-only attributed decisions with immutable audit, locked revisions,
idempotency and race tests. Any consequential stock, demand or custody effect
must require separate business authority. Read-only repeated GETs are safe;
offset pages are independent snapshots and can shift if source data changes.

## D5 verification

| Check | Result and limits |
| --- | --- |
| Focused stocktake/reconciliation integration | PASS: 16 tests |
| Full automated regression | PASS: 79 files, 608 tests; 2 opt-in recovery tests skipped (81 files / 610 tests discovered) |
| First full run | 605 passed, 3 failed, 2 skipped because setup credential lacked role/trigger authority; superseded by the successful isolated fixture-owner run |
| Final sandbox attempt | Local HTTP/PostgreSQL connections denied (`EACCES`); rerun with local test access enabled, separate from product failures |
| Restricted security/concurrency/QR/PDF | Included in successful full run; setup owner provisions fixtures, tests retain restricted runtime/identity/ledger roles |
| Typecheck | PASS, including configured-schema fix and recovery-harness prefix change |
| Frontend/PWA/server build | PASS; 15 PWA precache entries; Vite large-bundle advisory remains |
| Authenticated browser slice | PASS: synthetic administrator login, Inventory navigation and 26-row evidence preview; panel fits 390px phone and 1024px tablet viewports. Whole-app acceptance remains outstanding |
| Fresh nonempty restart/restore and authenticated post-restore operations | NOT PERFORMED in D5; previous milestone evidence is historical |
| Full lifecycle stock/commitment/custody/fulfillment reconciliation | Existing targeted invariants pass; new consolidated acceptance artifact remains outstanding |

Local logs: `.test-tmp/d5-final-stocktake.log`, `d5-final-full-elevated.log`,
`d5-final-build-elevated.log`, `d5-final-types.log`; synthetic browser evidence:
`.test-tmp/d5-evidence.json`, schema
`requirement_test_902be857fe194a538a78a98e5289d093`.
Logs, database dumps and credentials are deliberately uncommitted.

The authenticated browser exposed an incorrect `current_schema()` availability
check under the restricted `pg_catalog`-first search path. D5 now qualifies the
allowlisted source with the configured application schema; the focused test uses
that runtime search path. The browser then displayed the evidence successfully.
Phone/tablet panel scroll width stayed within its visible width (350/351px and
687/688px). This checks panel reflow, not the entire page or physical devices.
The local built app used freshly provisioned restricted synthetic roles and a
synthetic administrator in the isolated test schema; no real account was changed.

The normal development server fails its restricted database-authority startup
validation. No safeguards or existing credentials were changed to bypass it.
The connected PostgreSQL cluster reports a data directory outside repository
`.local-dev`; restarting it fails the recovery harness's workspace-only safety
contract. A dedicated workspace-owned cluster is required for the new drill.
The harness now accepts `PRODUCTION_RECOVERY_ARTIFACT_PREFIX=d5` to preserve prior
D3 evidence, with the existing default retained. Prefix syntax is validated;
the restart/restore branches of that change await a real isolated drill.

## Security, upgrade and staging prerequisites

- Provision distinct restricted runtime, identity and ledger LOGIN roles using
  the reviewed boundary grants; keep the migration/owner role outside server
  configuration. Verify startup fails closed for owner, missing grants and
  wrong authority. No real secret provisioning/rotation occurred in D5.
- Configure a strong stable JWT secret, allowed origins, TLS, session/refresh
  controls, revocation handling and operation-bound scopes in approved staging.
  Re-run forged/revoked/cross-tenant and immutable-audit checks there.
- Inventory schema versions and default-off feature flags before upgrade. Back
  up nonempty evidence; migrate under the owner in maintenance; verify restricted
  startup and replay before reopening. D5 introduces no migration. Do not assume
  destructive down-migrations reverse immutable events; use reviewed forward
  repair or restore/replay under an approved maintenance plan.
- Restrict backup/dump access, encrypt off-host copies, assign custody/retention,
  and test a fresh-database restore, restart, exact retries and a fresh authorized
  post-restore operation. Compare stock, commitments, custody, delivery and audit
  fingerprints and record RPO/RTO. Do not publish dumps or credentials.
- Assign monitoring for readiness, failed startup/auth, DB availability, rejected
  operations and backup failures. Confirm logs redact secrets and an operator
  can distinguish offline, pending and committed actions without blind retries.

## Severity, approval and pilot checklist

| Severity | Open condition | Required owner/action |
| --- | --- | --- |
| Critical gate | No operational cutover authorization or physical opening balances | Business/warehouse approvers approve counted scope and signed units/locations; keep live writes disabled |
| High | Reconciliation decisions and lineage analysis incomplete | Implement synthetic decision/audit/concurrency contract; administrator reviews evidence; business separately authorizes mappings, demand and any correction |
| High | Full authenticated integrated UI acceptance outstanding | QA runs every supported screen and role at desktop/tablet/phone widths, including denied, conflict, offline and retry states |
| High | Fresh D5 recovery unproven | Operations supplies dedicated workspace/staging cluster and completes nonempty restart/restore with authenticated reconciliation |
| High | Normal development/staging role configuration incomplete | Security/DB administrator provisions reviewed restricted grants and deployment secrets under separate approval |
| Medium | Cross-source consolidated reconciliation and pagination incomplete | Add full-lifecycle report and stable snapshot pagination before treating exports as complete inventories |
| Medium | Bundle size and comprehensive accessibility unmeasured | Measure load on target network/device; audit keyboard/focus/screen-reader and dense data reflow |

All following human/device checks are **NOT PERFORMED**:

1. Warehouse lead counts each authorized item/location, records units and
   exceptions, obtains independent review and posts only approved opening counts.
2. Packing staff print actual QR/PDF labels, scan each unit on target hardware,
   test damaged/duplicate codes, and verify six QC checks and rejected-state recovery.
3. Operators complete production through partial packing/dispatch on actual
   tablet/phone; check touch targets, keyboard, screen reader, camera permissions,
   network loss/reconnect and uncertain retry without duplicate consumption.
4. Dispatch lead and school recipients verify multi-school quantities, partial
   acknowledgments, installation photos/attachments and closure authorization.
5. Operations/backup custodian performs the fresh restore drill, measures RPO/RTO,
   verifies off-host access, records incident ownership and obtains signoff.
6. Named business, warehouse, procurement, QC, dispatch, school and security
   approvers sign the evidence matrix and separately authorize pilot scope,
   staging deployment, credential provisioning and eventual cutover.

Go only when all high/critical gates have evidence and named signoff. Historical
activation, stock corrections, inferred demand, real inventory changes, deployment,
main merge and blocked legacy paths remain outside this delivery. Stop after D5.
