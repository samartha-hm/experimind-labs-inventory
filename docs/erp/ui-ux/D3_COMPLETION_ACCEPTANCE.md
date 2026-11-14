# D3 completion acceptance — 2026-10-22

## Verdict

**PASS for the supported, isolated synthetic D3 workflow.** An authenticated
administrator can issue approved material, record consumption-funded output,
allocate that output exclusively to exact school packages, and record six-check
QC acceptance or rejection. No additional raw-stock debit or school delivery
fulfillment occurs at packing or QC. This is not production activation.

## Authoritative contracts

Migration 26 adds immutable packing plans, allocations and QC receipts. Plans
freeze approved demand, published kit versions and school/package identities.
Allocations link exact output, work order, recipe, approval and demand line to a
package material line. Quantities use numeric(12,4); positive partial allocations
are supported. Remaining output equals produced quantity minus all allocations.
Project/plan/order locking serializes competing claims. Both output availability
and package-line capacity are enforced transactionally, including direct SQL.
Historical or ambiguous provenance cannot establish eligible output.

Original production-output receipts remain immutable pending-QC facts. Subsequent
allocation and QC receipts derive current custody without rewriting history.
Rejected quantities remain allocated; they do not create replacement inventory,
restore commitment capacity or become dispatchable. Packing/QC never advance H/F
or delivery entitlement and never repeat the original material debit.

QC records actor, package, allocation revision, decision, notes, and all six
boolean checks with nonempty evidence. Acceptance requires all checks passing
and complete physical material coverage throughout the package subtree. Rejection
retains evidence. Final ancestor QC locks descendants; rejected descendants block
ancestor acceptance. Stale revisions, duplicate final decisions and changed-key
replays fail. Exact retries return the same immutable identity only after current
session authorization. Deferred signed authorization and matching audit witnesses,
restricted roles and immutable-table triggers guard service/SQL bypasses.

## HTTP and operator workflow

All routes are under `/api/v1/production-planning`, after authenticated tenant
middleware. Operator mutations require an active tenant administrator:

| Method and suffix | Supported operation |
| --- | --- |
| GET `/trusted-packing` | Tenant-scoped plans, allocations, QC and available outputs |
| POST `/operator/packing/plans` | Freeze an approved school's packing plan |
| POST `/operator/packing/allocations` | Allocate eligible produced quantity to an exact package line |
| POST `/operator/packing/inspections` | Record authoritative six-check acceptance or rejection |

Mutation requests carry `Idempotency-Key`. Missing authority denies mutations;
validation/conflicts return a visible 409 with reconciliation instructions. The
queue uses a repeatable snapshot, returns at most 100 plans and 500 outputs, and
prioritizes a scanned package's plan using `?package=<uuid>`.

With explicit synthetic activation and `VITE_TRUSTED_PRODUCTION_ENABLED=true` /
`VITE_TRUSTED_PACKING_ENABLED=true`, use the existing Precision Operations screens:
issue material and record output; freeze the approved school plan; select its
package/material and eligible output; allocate an exact quantity; review own-line
and subtree pouch/kit/crate progress; enter six checks, evidence and notes; confirm
physical inspection and accept/reject. Saved requests support exact retry after
session renewal, or explicit reconciliation before changing a request. Final
receipts show actor and evidence. Rejected/final packages cannot allocate again.

QR links identify a stable package at `/?trusted_packing_package=<uuid>`. Labels
include school/project/subject/grade/version/revision/package/parent and QC actor
information. PDF preview/download uses a vector QR with a four-module quiet zone;
labels explicitly state dispatch is blocked. UI flags remain off by default.

## Business and adversarial evidence

Authenticated integration verifies School A's two complete Science Grades 8–10
sets produce six common and two universal crates; School B's three Grade 8-only
sets produce three common and zero universal crates. Five Math kits remain
independent with no Science crates. Each selected Science grade requires exactly
one common-crate definition; universal crates require explicit complete sets.
Shared pouch/activity references do not create duplicate physical material demand.
These larger scenarios verify frozen plan quantities; the smaller Science fixture
exercises physical output allocation through accepted and rejected QC.

Restricted-role authenticated tests cover partial allocation, concurrent packers
(one winner), output/package caps, wrong school/tenant, missing/revoked sessions,
wrong scope, durable replay, changed requests, stale demand/custody, incomplete QC,
concurrent acceptance, rejection, ancestor conflicts, and three rollback points.
Runtime writes, identity reads, unsigned writer transactions, immutable-row edits,
and audit tampering are denied. Stock, commitments and fulfillment are unchanged
by packing/QC; failed transactions leave no allocation/audit/authority fragments.

## Final verification

- Focused requirement integration: 37 passed.
- Full automated suite: 606 passed; 78 files passed, two opt-in recovery files
  skipped. D3 production recovery was then explicitly run below. The other skip
  is the existing dedicated D2 receipt-recovery harness, outside this D3 change;
  ordinary receipt regressions remain in the full suite.
- Typecheck: passed.
- Enabled frontend/PWA/server builds: passed; existing large frontend chunk
  warning remains, with no build failure.
- Edge operator component browser: passed at 390×844 and 1024×768 against actual
  authenticated HTTP. Covered scanned package selection, keyboard QC/exact retry,
  immutable evidence, final/rejected allocation denial, server ancestor conflict,
  retained retry request, PDF preview/download and no horizontal overflow.
  This is not a whole-app login/navigation or comprehensive accessibility audit.
- QR/PDF regression: passed, including exact QR matrix/quiet zone, invalid identity
  and origin denial, dispatch-blocked label content, and no snapshot mutation.
- Actual PostgreSQL stop/start: passed with changed postmaster. Fresh nonempty
  database restore: passed. Before/restart/restore authenticated HTTP exact retries,
  duplicate denial, commitment replay and all custody/stock/audit hashes matched.

Recovery source: `experimind_kitbuilder_test`, schema
`requirement_test_914dcabdf0294314977a34590d066db2`; fresh restored database
`experimind_production_restore_e4b7969e11d1c463`. Evidence covers 12 stock rows,
101 commitment events, 34 replayed accounts, two output receipts, four packing
plans, three allocations, two QC receipts, 17 audit rows and 71 authorizations.
Local evidence is `.local-dev/d3-recovery-summary.json`; dumps, credentials and
synthetic data are not committed.

Reproduce with the guarded synthetic test URL: run Vitest with two workers and
`REQUIREMENT_REVIEW_EVIDENCE_PATH=.test-tmp/d3-evidence.json`, then typecheck and
build. Run `scripts/verify-production-recovery.mjs` with `PRODUCTION_BROWSER=true`
and the verified isolated `PRODUCTION_RECOVERY_DATA_DIRECTORY`. It verifies its
database/schema/cluster before restart and restores to a fresh synthetic database.
Use normal Windows TEMP; repository-local TEMP violates attachment-root guards.

## Explicit boundaries

No dispatch, delivery fulfillment, rework, reversal, compensation, historical
reconciliation activation, real inventory activation or D4 is enabled. Existing
recipe publication/output claims retain their authorized prerequisite workflow;
ambiguous multi-line/historical claims remain blocked. No deployment or main merge
was performed. Migration activation is explicit and restricted to synthetic data.
