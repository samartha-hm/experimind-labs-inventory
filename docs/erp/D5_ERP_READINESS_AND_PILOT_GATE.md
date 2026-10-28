# D5 ERP software acceptance — 2026-10-28

**All evidence is SIMULATED / SYNTHETIC. No physical QC or pilot approval.**
Branch: `feature/kit-builder-milestone-1`.
Starting HEAD: `1b47253c9b42e71eb6c78376469436a9daa63a43`.
Implementation checkpoint: `.agent/SESSION_HANDOFF.md`.

## Independent verdicts

| Gate | Verdict | Scope |
| --- | --- | --- |
| Trusted supplier receipt/QC | PASS | Synthetic authenticated operations, stock effects and denial/retry integration checks. |
| Historical review/reconciliation software | PASS, scoped | Existing append-only review and read-only structural simulation; no activation authority. |
| Actual historical activation | BLOCKED | Requires authoritative documents, approved mapping and separate business authorization. |
| Full-app automated acceptance | PASS, scoped | Real production application browser journey below; fixture boundaries disclosed. |
| Synthetic software readiness | PASS | Browser, security/accounting, regression, build and same-schema recovery evidence. |
| Operational pilot readiness | NO-GO | Physical inventory/QC, staff sign-off, real hardware and deployment/provisioning acceptance remain outstanding. |

## Blocker resolution

Replaced native stocktake confirmation with an accessible application dialog:
identity/count/baseline details, irreversible-effect text, initially focused Cancel,
keyboard dismissal, focus restoration and busy protection. Cancellation and tab
interruption cannot post. Posting still requires explicit confirmation.

Stocktake posting uses the existing trusted writer, with live session/user checks
under the transaction lock. Administrator and manager stocktake permission does
not grant manager access to other trusted administrator operations. Runtime
credentials cannot write stock ledger; revoked sessions fail closed. Narrow
writer grants retain canonical events, audit and immutable ledger safeguards.
Production role provisioning remains a separate operational prerequisite.

The deterministic Playwright harness starts the built server on port 3006, waits
for health, uses installed Edge in headless mode with UTC, and isolates this spec
from ordinary browser runs. PWA precache now accommodates the existing entry
within a bounded 4 MiB limit. Browser receipt timestamps retain milliseconds;
truncating them could make immediate acknowledgment predate its dispatch.

## Browser evidence and fixture boundaries

`tests/browser/d5.pw.ts`: two real-browser tests passed (44.1 seconds).
Authenticated UI performed stocktake create/count/review/approve/confirm, school
requirement calculation/approval, PR/PO, receipt/QC, work-order issue, finished
output, packing allocation, all six QC checks, dispatch, manifest preview/PDF,
partial and final school receipts, installation completion/recipient acceptance,
and school closure. Partial delivery kept closure disabled. Download began `%PDF`.
Dialog keyboard, cancel, interrupted-tab recovery, and bounds at 390×844,
1024×768 and 1440×1000 passed. This is targeted responsive/accessibility evidence;
it is not an exhaustive device, screen-reader, offline or browser role/flag matrix.

Fixture/setup used authenticated HTTP for catalog and project creation and saved
planning. An isolated owner fixture created an empty finished-item catalog entry;
authenticated scoped authority published the recipe and claimed its work order.
Procurement and production projects were separate because existing PO demand
claims must not be reused for work-order claims. These setup operations are not
claimed as browser transitions. All QC attestations were explicitly simulated.

## Accounting and identities

Schema: `requirement_test_41aba90049184ca4aced784f280d4c6b`.
Actor: `9a235ab1-a9d4-4c7e-a019-19b4924b38d9`.
Stocktake: `fa6b2bc4-5da2-4310-83df-3879f2a433b3`; posted r5, immutable
12-unit event `a8e0cf1f-8cbc-4773-82d2-b109693626e0`. Exact r4 retry made
no second movement; revoked-token posting returned 403. Legacy quantity stayed
unchanged. Prior interrupted session `4c6e3a5f-db11-4c79-9fd2-a892f640997e`
remains approved r4 with zero stock events; it was not retried blindly.

Receipt `545bba85-bb20-4b79-b33d-cc84e02ab540` adds 2; issue
`e1860af4-92eb-49b4-a307-2cbfb84258dd` consumes 2. Raw balance is 12.
Output `67977469-1dce-422b-869b-1dd7b4cb2c18` has quantity 2 and total
allocation 2. Dispatch `2a8e6134-e463-4bee-8bcf-58758256d966` contains two
school assemblies with fully fulfilled, unreleased claim lines. Partial receipt
`93a0eb5e-7a74-4a30-94ae-fe39238c6bbf` delivered one assembly; final receipt
`d686cfd6-5b28-47bb-ae35-0b7ed5e8c682` completed delivery. Installation
`4a850ff4-5f24-478d-bc18-2302f7c3f540` completed; closure
`aa302bde-8663-44cf-975b-ba8b0083bba1` is closed with no blockers.

## Verification and recovery

Full suite: 608 passed, two opt-in recovery tests skipped. Typecheck and
frontend/PWA/server build passed. Security integration covers runtime denial,
concurrent exact posting, stale competing baselines, actor/audit attribution,
viewer denial, manager scope and revoked sessions.

Explicit nonempty recovery passed before restart, after a real workspace-owned
PostgreSQL restart, and in fresh database
`experimind_production_restore_1a0f556a922833e3`. All 103 commitment accounts
replayed; fingerprints of 30 stocktakes, 142 stocktake events, 60 ledger rows,
production, packing, delivery, audit and closure records matched. Authenticated
stocktake/output/packing/dispatch/receipt exact retries caused no extra movement;
a changed output identity was denied. No fresh mutation of the closed school was
attempted. An earlier recovery used an older schema and was superseded by this
same-browser-schema run.

Local evidence is ignored under `.local-dev/d5-browser/` and
`.local-dev/d50-recovery-summary.json`; credentials and database backups are not
committed. Browser emits recovery request evidence. Reproduce recovery with
`PRODUCTION_RECOVERY_ARTIFACT_PREFIX=d50`,
`PRODUCTION_RECOVERY_EVIDENCE=.local-dev/d5-browser/recovery-evidence.json`,
`PRODUCTION_RECOVERY_DATA_DIRECTORY=.local-dev/d5-closure-pg` and
`node --env-file=.env.kit-builder-development scripts/verify-production-recovery.mjs`.
Private isolated account/environment setup is required for the browser harness.

D5 stops here. No merge, deployment, real stock activation, historical activation,
physical QC approval or pilot cutover is authorized by this acceptance.
