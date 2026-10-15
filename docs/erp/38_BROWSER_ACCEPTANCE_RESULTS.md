# Local browser acceptance — 2026-10-15

Controlled local pilot at http://127.0.0.1:3100 with synthetic accounts in two
organizations. No production deployment, merge or historical source overwrite.
Browser source: `tests/browser/pilot.pw.ts`; config: `playwright.config.ts`.
Credentials, screenshots, downloaded files, fixtures and logs remain ignored in
`.local-dev/`. Screenshot/text evidence: `browser-acceptance/automated/` beneath it.

The in-app browser loaded login, but fresh-tab accessibility actions returned stale
references or left clicks inert. Standalone Microsoft Edge provided the permitted
fallback. Rendered controls and reloads performed the workflows; authenticated
browser requests supplemented denial, replay and invariant assertions.

| Scenario | Result | Observed behavior |
| --- | --- | --- |
| A01 navigation | PASS | Admin login, sidebar sections and overview return. |
| A02 catalog | PASS | Required-field validation; create/reload and edit/reload. |
| A03 kit | PASS | Science grades 8–10, activity/material, box/partition/pouch, common/universal crates; save/reload/approve; later draft edit leaves approved versions and other masters unchanged. |
| A04 project/sites | PASS | Two schools and distinct destinations persist. |
| A05 requirements | PASS | Common/universal counts A: 6/2, B: 3/0; missing confirmation blocked. |
| A06 stocktake | PASS | Unposted counts unavailable; approve/post/reload; duplicate posting blocked. |
| A07 reservations | PASS | Reserve/adjust UI; replay protection; stale revision 409 and reload recovery. |
| A08 procurement | PASS | Shortage request, supplier, PO, receipt inspection; rejected receipt leaves ledger unchanged. |
| A09 production | PASS | Recipe, plan/reserve/issue four, output four, reject one/accept three; completion/reload and exact ledger/replay checks. |
| A10 packing | PASS | Two schools; exception/correction, multi-package rejection, reassembly/reinspection, Ready; picks exactly once. |
| A11 labels/lookup | PASS | PDF preview/reprint; authenticated QR lookup; signed-out/other-tenant denial. |
| A12 delivery | PASS | Five split deliveries including common crates; partial POD, failure, return/retry; immutable manifests and no stock reposting. |
| A13 installation | PASS | Notes/survey/tasks; unresolved issue blocks completion; correction, installation and administrative acceptance. |
| A14 closure | PASS | Release remaining reservations; close/reopen/resubmit/accept/close and reload/history. |
| A15 permissions | PASS | Viewer writes and staff dispatch denied; tenant isolation. |
| A16 session | PASS | Unsaved form, sign-out, 401, reauthentication and persisted-state recovery. |
| Attachments | PASS | Project/survey/installation/delivery uploads and byte-identical downloads; forbidden type/oversize, viewer and tenant denials; reload. |
| Shared labels | PASS | Width 103 saved and loaded in a second browser context; PDF; packing/ledger unchanged. |

Passing logs under `.local-dev/`: `browser-navigation.log`,
`browser-resume-tests.log`, `browser-current.log` (A10–A11),
`browser-delivery-install.log`, `browser-final-remaining.log` (A09, A13–A16),
`browser-extras-final.log` (shared labels), `browser-attachments-verified.log`,
`browser-isolation.log`. Earlier failures remain retained and are superseded only
by the named successful checks. Scenarios ran in targeted groups against a shared
saved fixture; a single uninterrupted clean suite run is not claimed.

## Fixes and verification

- Scope global limiting to `/api` so Vite assets do not consume the API budget.
- Supply auth context's existing consumers with `currentUser` and organization ID.
- Use packing summary `site_name` and hydrate detail before delivery allocation.
- Avoid initial production-load refresh callbacks that caused repeated reloads.
- Defer QC ancestor resets until selected packages are inspected: rejecting a
  child previously cleared a selected parent's assembly state and caused 409.
  The packing regression now rejects the whole tree and verifies recovery.
- Include standalone common crates in dispatch roots; kits-only selection left
  crates undispatchable and prevented closure. A focused unit test covers roots.

Full suite: **476 tests / 65 files passed**, serial workers with 15-second test
timeout (`final-tests-serial.log`); focused packing integration: 17 passed.
Typecheck, frontend/PWA and server build pass (`final-typecheck.log`,
`final-build.log`, `final-server-build.log`); existing bundle-size warning remains.
Browser tests use one worker, zero retries and default mode so a failure does not
skip unrelated scenarios. Run `npm run test:browser` after preparing private
accounts, isolated database and server per runbook 34. Later targeted tests need
the fixture created by the initial scenarios.

Read-only live reconciliation passes: verified ledger balances/sequences/units,
reciprocal picks, receipts, production issues/QC, reservations, dispatch claims,
custody and tenant references; eleven attachment digests match (`final-reconcile.log`).
All 13 additive migrations 0000–0012 are present; 16 legacy migrations stay absent.

## Remaining limitations

- **Live historical before/after is UNVERIFIED.** The current PostgreSQL 17.4 browser
  fixture is distinct from the retained October 14 database; historical IDs cannot
  serve as its before/after baseline. No retained source was copied over the live DB.
- Independent read-only retained recovery validation passes: 85 tables, two
  sequences, nine inventory rows, twelve ledger rows and eleven object hashes
  match the saved manifest (`final-retained-history.log`); original dump unchanged.
- Strict recovery validation reports schema-hash mismatch on the dump's PostgreSQL
  17.5 source-version comment versus restored server 17.4. Independent comparison
  verifies schema equality excluding only that comment, plus original dump hash,
  rows/sequences/objects. Strict validation is not reported as passing
  (`final-recovery-validation.log`).
- Physical printer alignment and printed QR scanning need an operator.
- QMS/signature/RMA mutations remain deferred with 503 responses.

## Milestone 12 follow-up

See [pilot readiness and final acceptance](39_PILOT_READINESS_AND_FINAL_ACCEPTANCE.md)
for independently validated historical/current baselines, the recovery-validator
correction and four synthetic label checks. These supplement A01–A16; physical
print/scan acceptance remains pending operator evidence.
