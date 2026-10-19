# 13M-D2B2-B-S — legacy receipt closure and recovery proof

Date: 2026-10-19. Scope: isolated synthetic PostgreSQL and actual Express receipt
handlers. No deployment, main merge, historical activation, real stock change,
D2R or D3 work is authorized. Final verification results appear below.

## Preserved starting state

Branch `feature/kit-builder-milestone-1`; local and live remote HEAD both
`045c479f5deba1514e565fb3139b4590cd6eef92` before changes. Remote was checked
with `git ls-remote origin refs/heads/feature/kit-builder-milestone-1`.

Initially tracked modifications (17 files):

- `.agent/NEXT_TASK.md`, `.agent/SESSION_HANDOFF.md` — preserved for the separate final handoff commit.
- `AGENTS.md` — unrelated user edit; excluded from staging.
- `scripts/review-commitment-recovery.mjs`, `server.ts`, `src/db.ts`.
- `src/routes/__tests__/purchaseOrderCommitment.cases.ts`.
- `src/routes/v1/purchase-order.ts`, `src/routes/v1/supply-planning.ts`.
- `src/security/TrustedLedgerAuthority.ts`, `src/security/databaseBoundary.ts`.

- `src/routes/__tests__/supplyPlanning.integration.test.ts`, `src/services/__tests__/workflowE2E.test.ts`.
- `src/services/PurchaseOrderService.ts`, `src/services/StockLedgerService.ts`, `src/services/SupplyPlanningService.ts`, `src/services/SupplyStockService.ts`.

Initially untracked (8 files), preserved and incorporated:

- `docs/erp/ui-ux/MILESTONE_13M_D2B2_B_RECEIPT_QC_CONTRACT.md`.
- `docs/erp/ui-ux/MILESTONE_13M_D2B2_B_R_RECOVERY_REPORT.md`.
- `src/migration/1792800000021-AddReceiptCommitments.ts`.
- `src/routes/__tests__/receiptHttp.cases.ts`.
- `src/services/ReceiptCommitmentService.ts`.
- This B-S report, `scripts/verify-receipt-recovery.mjs`, and `src/routes/__tests__/receiptRecovery.integration.test.ts`.

No reset, clean, blanket staging, historical rewrite or database reinitialization
was performed. Changes extend the existing uncommitted receipt implementation.

## Entry points and disposition

| Entry point | Consequential behavior |
| --- | --- |
| Supply planning `POST /orders/:id/receipts` | Strict DTO, live actor permission, access-session-bound capability, current approved demand/PR/PO lineage and exclusive coverage; creates pending evidence only. |
| Supply planning `POST /receipts/:id/{accept,reject,quarantine}` | Same authority; explicit versioned QC; acceptance alone posts physical stock. |
| Supply router without receipt authority | 503 for receipt and every QC verb; no migration query or feature toggle can select legacy execution. |
| Legacy purchase-order `POST /:id/receive` | Authenticated tenant middleware, then unconditional 503 with guarded-authority guidance. |
| `SupplyPlanningService.receive/inspect` | Unconditional 503; removed automatic acceptance and private legacy posting implementation. |
| `PurchaseOrderService.receiveItems` | Unconditional 503; removed direct legacy inventory and stock-ledger writes. |
| `StockLedgerService.postEntry(PO_RECEIPT)` | Rejects before opening a transaction. |
| `postVerifiedSupplyMovement` receipt source | Requires installed receipt mapping, accepted receipt, exact organization/item/quantity/unit/location/actor/ledger identity. |
| Direct SQL receipt/stock insert | Restricted grants plus deferred reciprocal receipt witnesses; unmapped receipt or supplier-stock records reject even with ordinary owner DML. |

Read-only legacy endpoints remain available. No scheduled worker calls a separate
supplier-receipt implementation; operational call sites were checked in routes,
services and workers. Privileged owners can deliberately disable constraints;
that administrative power is outside restricted-runtime authority.

## Adversarial proof

The PostgreSQL boundary fixture mounts the actual supply and purchase-order
routers over loopback HTTP. Tokens come from real synthetic users/sessions and
the private ledger authority. The legacy global repository is redirected only
to the restricted fixture connection; authentication and handlers execute.

| Probe | Expected result and invariant |
| --- | --- |
| Missing body, empty/malformed planning fields, invalid line identity, extra actor | 400; no receipt/commitment/audit/stock mutation. |
| SQL PO planning lines missing, empty, scalar or forged | Existing PO witnesses reject the attempted source; HTTP using its nonexistent ID rejects, legacy handler returns 503. This is not evidence of successfully persisted malformed POs. |
| Foreign tenant session; substituted project, school/site, approval, item lineage, PO/line/coverage/revision | 403/409 according to validation; exact snapshot unchanged. |
| Unapproved alternative PO and historical/unmapped source IDs | 409; no coverage or stock. |
| Quantity exceeding owned coverage | 409; no receipt or stock. |
| Three simultaneous partial deliveries | Three disjoint mapped intervals; no stock before QC. One explicitly rejected; remaining pending evidence supports recovery. |
| Same capability and key retry | Identical cached result, no repeated evidence or stock. |
| Changed payload with same capability/key, different-key accept replay, duplicate concurrent accept | Reject; exactly one accepted stock movement. |
| Expired, wrong-scope, wrong-subject, substituted access session, revoked session, changed actor permission | Deny; retry also rechecks live session, permission and current requirement. |
| Injected receipt audit failure | Transaction rolls back receipt, decision, authorization and stock changes. |
| Direct legacy services/generic receipt stock helper | Reject with unchanged snapshots. |
| Restricted writer and migration-owner stock clones without guarded mapping | Deferred witness rejects; snapshot unchanged. |
| Populated migration down | Refuses; immutable evidence remains intact. |

Assertions compare consequential records, not just response codes. Receipt/QC
never adds H, fulfills school demand or changes A/F/H/U. Rejected and quarantined
deliveries keep their consumed coverage; replacement requires new approved PO
coverage. Decrease, cancellation and return-to-PR remain blocked.

## Recovery procedure and boundaries

Use the synthetic source database `experimind_kitbuilder_test` on
`127.0.0.1:55432`, a `requirement_test_<32 hex>` schema emitted by the focused
suite, and the local development environment file. No credentials are recorded.
Set TEMP/TMP to `.local-dev/verification-temp` for this Windows installation.

```powershell
$env:REQUIREMENT_REVIEW_EVIDENCE_PATH='.local-dev/13md2b2bs-evidence.json'
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run src/routes/__tests__/requirementApproval.integration.test.ts --reporter=dot
node --env-file=.env.kit-builder-development scripts/verify-receipt-recovery.mjs
```

The orchestrator validates the exact database/port/schema and canonical cluster
directory before restarting. Each phase runs in a fresh Node/Vitest process,
initializes fresh restricted LOGIN connections, mounts actual production route
handlers, authenticates a real session, performs QC over HTTP, retries, and tests
closed/duplicate paths. It closes the HTTP listener and pools before exiting.
The PostgreSQL restart uses `pg_ctl restart -m fast -w -t 45`; postmaster start
time must change. Subprocess output uses files to avoid Windows inherited-pipe
hangs; a development attempt restarted PostgreSQL successfully but stalled on
that pipe, so the final proof starts again from a fresh synthetic fixture.

The nonempty schema is dumped with `pg_dump --schema <schema> --no-owner
--no-privileges`, restored by `psql -X --single-transaction -v ON_ERROR_STOP=1`
into newly created `experimind_receipt_restore_<16 hex>`. It retains its schema
name so pinned function search paths remain valid. Three newly generated LOGIN
roles (`rrt_`, `rid_`, `rlg_` plus 16 hex) supply runtime, identity and private
ledger connections. Exact role names and assertions are in ignored phase JSON.
Roles have no superuser, createdb, createrole, replication or bypass-RLS power.
PUBLIC database/schema CREATE is revoked, boundary grants are reprovisioned,
and all three connections must pass `assertDatabaseBoundary` before HTTP.
Owner credentials provision the schema/grants/roles; restricted connections
authenticate users and execute consequential operations. Temporary roles are
removed after their connections close.

Twenty-one table fingerprints must match before the next phase starts.
Authorized quarantine adds no stock; restart acceptance adds one movement;
fresh-restore acceptance adds one movement. Every phase asserts stable demand
balances, no duplicate receipt stock, receipt and PO witnesses, and replayed
commitment balances. The dump includes pending, accepted and rejected receipts,
immutable decisions, authorization and stock records. Quarantine is proved before
restart, and its acceptance is proved after restart.

This is process-restarted HTTP handler integration proof, not acceptance of a
deployed server, public capability issuance UI or production startup. Production
activation remains gated; the server's optional writer remains synthetic-only.

## Migration and forward recovery

Migration 21 is explicit and synthetic-only; startup does not install it. Apply
with owner provisioning, then restricted runtime/identity/ledger role separation,
pinned function paths, revoked PUBLIC execution and startup assertions. Receipt
and supplier-stock witnesses reject new unmapped evidence. Existing historical
rows are not reconciled or enabled. For a previously installed development copy
of migration 21, use a reviewed forward schema change for the strengthened
witnesses; do not silently edit a deployed migration history.

Rollback retains receipt schema/history and disables the application action.
Migration down deliberately refuses. Restore into a fresh isolated database,
reprovision roles and verify restricted HTTP/replay before any consideration of
activation. Backups, environment files and raw evidence stay under ignored
`.local-dev`; they are not committed.

## Final acceptance — 2026-10-19

**PASS for the isolated synthetic D2B2-B checkpoint.** This supersedes the earlier
blocked B-S result. Packing reliability is repaired; receipt/QC remains gated
against production activation. No D3 implementation was performed.

| Check | Fresh result |
| --- | --- |
| Focused approval/receipt PostgreSQL, supply integration and workflow | 55/55, 3 files, 24.36 s; includes 37 authoritative PostgreSQL/adversarial cases |
| Restricted actual HTTP before restart / after restart / fresh restore | All 3 phases PASS in separate processes |
| Default-worker full regression | 582 passed, 1 skipped; 77 files, final source 43.60 s (prior pass 43.81 s) |
| Packing isolated after fix, runs 1 / 2 / 3 | 19/19 each; original label test 573 / 512 / 572 ms |
| QR vector content regression | PASS; both package matrices and quiet zones match printed PDF modules |
| TypeScript | PASS; final log `d2b2-final-typecheck.log` |
| Frontend/PWA and server production build | PASS (`npm run build --silent`); existing chunk-size warning is nonfatal; PWA precaches 15 entries |
| Whitespace | PASS (`git diff --check`) |

The single skipped test is `receiptRecovery.integration.test.ts`, intentionally
opt-in via `RECEIPT_RECOVERY_PHASE`; it passed once per each of the three recovery
phases. It is not an excluded failing test. Historical 583-test suites predate
this receipt boundary: two legacy success tests became explicit fail-closed
coverage (net -2), the opt-in recovery test adds one, and the new QR regression
adds one. Thus the final total is again 583, with 582 passing and one explicit
recovery skip. Receipt success remains tested by the guarded HTTP/SQL cases.

### Packing failure: demonstrated cause and repair

The unchanged 5000 ms integration test prints and reprints 72 physical package
labels across two schools: 144 QR renders. Profiling the original path measured
3727 ms in PNG encoding/PDF image embedding of a 4048 ms isolated test (~92%).
The default-worker baseline reproduced the timeout: the first school's print
and reprint alone consumed 3024 + 1812 ms before the second school's labels.
Baseline full result: 580 passed, 1 failed, 1 skipped, 36.97 s. Earlier isolated
5007/5035 ms failures are consistent with the same expensive serial work;
worker contention amplifies it but is not the sole cause. No missing await,
shared-row collision, leaked receipt HTTP pool or browser readiness dependency
was demonstrated. UUID-isolated schemas, ports and awaited cleanup were retained.

`packingLabels.ts` now draws contiguous dark QR module runs as native PDF
rectangles, avoiding PNG encode/decode. Stable package destinations, M error
correction, the existing two-module quiet zone, 28 mm footprint and immutable
snapshots are preserved. The regression reads the actual PDF rectangle geometry
and checks every dark/light module and quiet-zone cell for two package IDs,
asserts no embedded image and no snapshot mutation. The existing integration
test and all timeouts/assertions are unchanged. Profiling instrumentation was
removed. Three isolated passes plus the normal default-worker full pass prove
the improvement without worker serialization or timing allowances.

### Fresh recovery evidence

Source schema: `requirement_test_7da7106a4a934b549d59315b6f9fff3b`.
Fresh restored database: `experimind_receipt_restore_b28c786c5675695e`.
All 21 table fingerprints matched across process/database boundaries; all 28
commitment accounts replayed in each phase. Real postmaster restart was verified.
Quarantine stock delta was zero; each authorized acceptance added exactly one
movement, exact retry added zero, and demand A/F/H/U remained unchanged.

Commands use the local environment file and workspace-local TEMP/TMP. Focused
acceptance ran approval, supplyPlanning and workflowE2E files together. Recovery
ran `node --env-file=.env.kit-builder-development scripts/verify-receipt-recovery.mjs`.
Full regression ran `node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --reporter=dot`
with unchanged Vitest defaults. Its evidence path was separate from the preserved
recovery source. Ignored local evidence: `d2b2-final-focused.log`,
`d2b2-final-packing-{baseline,profile}.log`, `d2b2-final-full-before.log`,
`d2b2-final-packing-fixed-{1,2,3}.log`, `d2b2-final-vector.log`,
`d2b2-final-full.log`, `d2b2-final-typecheck.log`, `d2b2-final-build.log`,
`13md2b2bs-evidence.json`, and `d2b2bs-recovery-{summary,before,restart,restore}.json`.
No credentials, raw dump or synthetic runtime roles are committed.

## Coherent roadmap to the working ERP

| Area | Actual checkpoint state | Remaining delivery |
| --- | --- | --- |
| Product templates and school planning | Dynamic/versioned templates, multi-school rules, immutable approved requirement lineage exist | Complete operator navigation, role-aware actions and usable exception states across the whole workflow |
| Inventory and reservation | Verified physical stock scopes, commitment ledger, capped reservation and PR/PO ownership have synthetic acceptance | Reviewed real opening balances and reconciliation; historical lineage must never be inferred |
| Procurement and receipt/QC | Exclusive PR-to-PO coverage and guarded pending/quarantine/reject/accept receipt evidence pass isolated acceptance | Authorized public capability issuance and supply UI; explicit PO settlement/cancellation/return contracts and forward migration plan |
| Production and packing/QC/QR | Existing production, package hierarchy, QC and label services/UI have separate fixture coverage; QR print performance repaired | Trusted commitment adapters joining these services to the current approved-demand chain; integrated consume/output/custody accounting |
| Dispatch, installation and closure | Existing delivery/installation/completion services and runbooks exist | Trusted downstream accounting, partial multi-school delivery, exception handling, acceptance evidence and closure reconciliation |
| Operations | Automated synthetic tests/build/restart/nonempty restore pass | Whole-server deployment validation, independent review, hardware/staff evidence and separately authorized controlled activation |

Migration 18's `commitment_reservation_downstream_gate` still rejects production,
packing, delivery, installation and completion writes for integrated reservation
projects. Separate legacy fixture passes do not prove that the new end-to-end
chain works. Feature flags and disabled actions do not substitute for adapters.
Packing workspace access is limited to development/test plus organization allowlist
and `PACKING_WORKSPACE_READ_ONLY=true`; writes additionally require
`PACKING_WORKSPACE_EXECUTION=true` and the authorized role/transition. Those
existing screens are not production activation evidence.

Every phase must preserve grade-specific Science common crates, complete-set
universal-crate rules, independent Math kits and exclusive shared-material
accounting. These rules belong in the integrated workflow acceptance, alongside
multi-school partial quantities, rather than being replaced by visual prototypes.

1. **Next substantial phase, only after separate authorization:** deliver one
   coherent approved-demand → reserved/accepted stock → production → packing/QC
   flow. Define the missing transition/accounting contract first, implement the
   trusted downstream adapters together with role-aware operator screens and
   capability issuance, then verify concurrent partial operations, retries,
   rollback, physical-stock conservation, labels and recovery as one workflow.
   Resolve settlement/return contracts where needed; do not silently enable
   unsupported reversals. This is proposed D3 scope, not work done here.
2. **Delivery through closure:** connect packing custody to dispatch, partial
   school deliveries, installation acceptance and final reconciliation. Build the
   staff workflow with clear status, validation, loading/error/empty states,
   refresh-safe retries, permissions and audit visibility. Gate closure on actual
   accepted evidence and reconcile all demand, stock and custody balances.
3. **Operational readiness and controlled pilot:** independently review authority,
   migrations and cross-module accounting; provision production roles/secrets/TLS;
   validate whole-server startup and restore; reconcile physical opening stock.
   Staff must verify real printer/scanner output, mobile/offline/PWA behavior,
   installation evidence and operational procedures. A signed pilot/rollout
   decision and separate activation authorization are required.

Avoid another series of receipt-only micro-checkpoints: group each phase around
one usable staff workflow and its accounting/recovery acceptance. Independent
review is still required before production use. No deployment, main merge,
historical activation, real inventory mutation, D2R or D3 execution is included.
The implementation checkpoint and then the short handoff are committed/pushed
separately, with full local/remote SHA verification after each push.
