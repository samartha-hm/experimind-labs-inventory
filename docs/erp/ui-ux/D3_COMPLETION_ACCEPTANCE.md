# D3 completion acceptance — 2026-10-22

Verdict: **BLOCKED — integrated D3 packing/QC execution remains incomplete.**
This checkpoint implements trusted material issue and pending-QC recipe-output
custody, not full D3 acceptance. No remaining material-approval decision is needed.
Branch: `feature/kit-builder-milestone-1`; starting code: `e3aae31a9eccafc820a185848cce0292e534439b`.

## Implemented authority and accounting

Approved, frozen recipe inputs and exclusive approved school-output claims confer
separate capped recipe-material entitlements. Raw inputs need not be present in
the school snapshot. Migration 24 already implements that resolved decision.
Migration 25 adds immutable output custody without modifying historical migrations.
Both use explicit isolated synthetic activation; no real-data activation occurred.

Every material account retains A = F + H + U. Trusted issue atomically debits
verified physical stock and converts the same material claim H to F, with immutable
issue, audit and signed receipt evidence. School delivery F is unchanged.

New output records retain tenant, work order, immutable recipe and approved school
lineage through the work-order witness, exact quantity/unit, location, actor,
source identity, supporting material issues and stable ERP:OUTPUT:<uuid> identity.
A work-order lock serializes cumulative output. Output cannot exceed the exclusive
planned quantity or the fraction supported by every consumed recipe input.
Inexact four-place allocations fail; output creation never debits stock again.
Output is always `recipe_output` / `pending_qc`. It is not accepted packing stock.

## Execution and mutation matrix

All routes below are under `/api/v1/production-planning`.

| Operation | Authority and result | Status |
| --- | --- | --- |
| POST recipe-versions | Current admin session, scoped capability, immutable recipe | Existing migration 23 |
| POST work-order-claims | Approved school line, exclusive output claim, frozen recipe/material caps | Existing migration 24 |
| POST orders/:id/material-issues | Scoped capability, physical debit and material H→F | Verified |
| POST orders/:id/finished-outputs | Scoped capability, consumption-funded immutable custody | Implemented |
| POST operator/orders/:id/material-issues | Current admin session; server restricts capability issuance to this action | Implemented |
| POST operator/orders/:id/finished-outputs | Current admin session; exact durable retry result | Implemented |
| GET trusted-work-queue | Tenant-filtered read; latest 100 work orders and provenance | Implemented |
| Pouch, kit, common/universal crate allocation | Exclusive custody ownership and child allocation | Missing; guarded |
| Six-check QC, rejection/rework, packing acceptance | Conserved transitions and trusted receipts | Missing; guarded |
| Dispatch, installation, closure | D4 | Out of scope; guarded |

Writes require exact request identities and Idempotency-Key. Operator retries
validate a live session before returning an existing result; changed input under
the same key fails. A concurrent first retry may receive a conflict and then retry
the same request. The browser persists the exact pending request before sending,
retains it after an uncertain response, and requires explicit reconciliation to
clear it. No public general-purpose capability issuer was added.

The optional panel uses `VITE_TRUSTED_PRODUCTION_ENABLED=true` at build time and
requires the trusted server writer plus synthetic migrations. It is off by default.
It exposes material issue and output recording, confirmation, queue refresh,
material balances, pending custody and text QR identity. Recipe publication and
work-order claiming still require the existing capability workflow. The queue has
no pagination beyond its 100-order limit. This is not full operator acceptance.

## Verification evidence

- Database-enabled full suite: **605 passed, 2 opt-in recovery tests skipped**.
- Scoped synthetic requirement integration: **37 passed**, including output races,
  duplicate source/key handling, exact retry, input funding, excessive/invalid output,
  wrong order/unit/precision, revoked-session mutation/retry denial and no-authority
  guards. Physical stock and school-delivery fingerprints stay unchanged on output.
- Failure injection: four material-issue stages and three output stages roll back
  all stock, event, custody, audit and authorization changes.
- Restricted roles: runtime INSERT/UPDATE denied; unsigned ledger-writer output
  rejected by deferred witness; owner DELETE rejected by immutability trigger.
- Typecheck and frontend/PWA/server build pass, including the enabled panel build.
  Existing bundle-size warnings remain.
- Existing QR/PDF regression tests pass in the full suite. New custody identity is
  text only; custody QR graphics/PDF performance have not been accepted.
- Playwright Edge at 390×844: actual panel against authenticated restricted HTTP,
  persisted retry activated by keyboard, same immutable output returned, pending
  request cleared, queue/provenance refreshed, confirmation disabled until valid
  input, no page errors. Test-only auth bootstrap and component bundle were used;
  whole-app login, styled layout and full accessibility acceptance remain open.

Nonempty recovery was executed against synthetic schema
`requirement_test_a4b796011c9d4d70b1430673381407e8`. A real PostgreSQL restart changed
the postmaster start time. Schema dump restored into fresh database
`experimind_production_restore_4909d1d0ec0da8a1`. Fresh restricted-role HTTP servers
before/restart/restore returned the exact persisted output result; duplicate source
was denied. Stock, events, balances, claims, entitlements, work orders, issues,
custody, audits and authorization fingerprints matched. Commitment replay and
work-order evidence checks passed. Production recovery and browser tests ran
separately from the full suite; their opt-in skip is not a recovery failure.
Local evidence lives in ignored `.local-dev/d3-recovery-*.json` and test logs;
no database dumps, credentials or synthetic data are committed.

Earlier runs failed on Windows sandbox TEMP rename permissions; putting TEMP
inside the repository then violated attachment-root security guards. The successful
full suite used normal TEMP with approved execution permissions. Recovery initially
refused a mismatched default cluster directory; the actual isolated directory was
verified and supplied explicitly. The browser's first exact label locator timed
out; a role/name locator and bounded actions fixed it without increasing timeouts.

Reproduction: scoped `requirementApproval.integration.test.ts`; full Vitest
with two workers and the guarded synthetic KIT_BUILDER_TEST_DATABASE_URL;
`scripts/verify-production-recovery.mjs` consumes `.test-tmp/d3-evidence.json`
produced by setting REQUIREMENT_REVIEW_EVIDENCE_PATH on that scoped test.
The script verifies database/schema/cluster directory
before restart, accepts explicit PRODUCTION_RECOVERY_DATA_DIRECTORY, and restores
only into a fresh synthetic database. PRODUCTION_BROWSER=true on the before phase
runs the component browser check. Never point these tests at operational data.

## Remaining D3 gates and next implementation

1. Define exact conserved allocation from recipe output to school/grade/activity/
   pouch/kit/common-crate/universal-crate children, including partial quantities
   and remainders. Add append-only allocation witnesses and exclusive claims.
2. Implement trusted packing and six-check QC, acceptance/rejection/rework without
   decreasing consumed F, recreating capacity or double-debiting raw material.
3. Add supported operator flows for allocation/QC and recipe/claim prerequisites;
   verify full-app mobile/tablet/keyboard accessibility and QR/PDF rendering.
4. Execute two-school stock competition and integrated Science/Math packing,
   concurrent allocation/QC, rollback, replay and nonempty recovery acceptance.

Planning tests retain Science common crates per grade, universal crates only for
explicit complete Grades 8–10 sets, and independent Math kits without crates.
Those passing calculations do not establish missing physical packing execution.
Preserve legacy write guards until these replacement paths are verified. D3 stays
BLOCKED; do not start D4, deploy, activate real data or merge main.
