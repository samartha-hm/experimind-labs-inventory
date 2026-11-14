# D4 dispatch, delivery, installation and closure acceptance

Date: 2026-10-22. Verdict: **PASS for isolated synthetic acceptance**.
Physical scanner/printer and production rollout readiness remain conditional.
Branch: feature/kit-builder-milestone-1. Baseline:
d3b63b8af567c4156b01f275e398ff3c92199137.

## HTTP and operator workflow

Routes use /api/v1/production-planning. Writes require a current tenant admin
session, operation-bound signed authorization, immutable audit and idempotency key.

| HTTP | Operator UI | Server-confirmed contract |
| --- | --- | --- |
| GET /trusted-delivery | School dispatches, receipt history, QR lookup, PDF preview/download | Tenant-scoped frozen plans and custody; no-store |
| POST /operator/delivery/dispatches | Complete accepted assemblies, carrier, vehicle, planned time | Current frozen approval; complete allocation; accepted QC; exclusive descendant custody |
| POST /operator/delivery/acknowledgments | Actually received subset, actual time, recipient and evidence | Outstanding school units only; immutable receipt; exactly-once fulfillment |
| POST /operator/delivery/installations | Required checklist or explicit reasoned waiver | Existing school receipt; frozen receipt provenance; pending installation |
| POST /operator/delivery/installation-actions | Checks, issues/corrections, evidence, submission, recipient acceptance | Revision check; complete delivery/checks; resolved issues; installed then completed |
| GET /trusted-delivery/projects/:project/progress | School progress and closure blockers | Trusted receipts, installation and current project revision |
| POST /operator/delivery/closure | Explicit project recipient acceptance | All current schools delivered; required installations accepted or waived; reconciled production/custody; no unresolved issues or active stock reservations |

The client saves the exact payload and key before POST. Lost-response retries
survive reload. Clearing a pending request requires refresh and explicit
reconciliation. Success is displayed only after server confirmation.
VITE_TRUSTED_DELIVERY_ENABLED remains default off. Backend availability also
requires the trusted authority and isolated synthetic migrations.

## Conservation

Dispatch creates deliverable holds (H), without school fulfillment (F) or a stock
debit. Acknowledgment consumes only the selected grade/crate holds once.
Acceptance proves **H2/F0 → H1/F1 → H0/F2**, one winner for concurrent partial
receipts, and unchanged physical-stock fingerprints.

Batch, kit and pouch wrappers add no entitlement. Whole kit roots carry their
descendants. Parent/child selections, overlapping dispatch, repeated semantic
slot ordinals and receipts exceeding frozen quantities are denied. Manifests
contain frozen school, approval, demand revision, package version, carrier and
receipt facts, with vector QR codes and paginated text.

Material commitments are separate from school F. D3 material output claims and
work-order status are preserved. Closure permits an output hold only when its
exact quantity is both physically produced and fully allocated into packing.
Other unresolved holds, unfinished output and active reservations block closure.
Receipt never fabricates material consumption or debits stock again.

## Multi-school acceptance

Actual synthetic production, packing allocation, accepted QC, dispatch and
receipt ran for every assembly.

| School/selection | Acknowledged result |
| --- | --- |
| Science A | Two complete Grades 8–10 sets; six common crates; two universal crates |
| Math A | Five independent Math slots; no Science crate allocation |
| Science B | Three Grade 8 sets; three common crates; zero universal crates |

School A has 19 fulfilled grade/crate slots (14 Science + 5 Math); school B has
six. A separate closure fixture proves partial receipt, required installation,
issue correction, installer submission, separate recipient acceptance,
second-school waiver and explicit project closure.

## Verification

- Full regression: **79 files passed; 607 tests passed; two opt-in recovery tests
  skipped** in the ordinary run. Production recovery runs separately.
- TypeScript and frontend/PWA/server builds passed. Vite emits a bundle-size
  advisory; build output succeeds.
- Authenticated HTTP covers cross-tenant/school requests, forged identity,
  revoked sessions, wrong operation scope, stale installation revision,
  incomplete QC, duplicate/overlapping custody, competing partial receipts,
  changed-payload key reuse, backdated receipt and missing completion evidence.
- Injected dispatch-unit, commitment-event, audit and authorization failures roll
  back custody, balances, stock and witnesses together. Direct restricted
  service/SQL attempts and immutable evidence deletion are denied.
- Browser checks at 390px and 1024px prove keyboard retry of a persisted request,
  QR lookup, received status, disabled closed-project writes, manifest
  preview/download, invalid-label feedback and no horizontal overflow.
- Workspace PostgreSQL on loopback 55433 is restarted with a changed postmaster
  timestamp. A nonempty dump is restored transactionally into a fresh database.
  Before/restart/restore phases verify restricted authenticated HTTP, durable
  D3/D4 retries, table fingerprints and a new installation evidence operation.

Local evidence: .test-tmp/d4-regression.log, d4-types.log, d4-build.log,
.test-tmp/d3-evidence.json and .local-dev/d3-recovery-summary.json.
Generated local artifacts and unrelated AGENTS.md are excluded from the commit.

## Unsupported transitions and rollout prerequisites

Migrations 27/28 refuse non-synthetic database/schema targets. Validate real
printer output, QR contrast/dimensions and physical scanners before warehouse
use. Browser checks do not establish real-device readiness. Approve a production
migration and authority rollout separately.

Returns, rework, compensating fulfillment, closure exceptions/reopening,
historical ambiguous custody, signatures and blocked legacy QMS/RMA routes remain
unsupported. No deployment, real-stock activation, production credential change,
main merge or force push is authorized by this acceptance.
