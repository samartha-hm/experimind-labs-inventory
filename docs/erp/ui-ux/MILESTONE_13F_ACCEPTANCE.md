# Milestone 13F acceptance — 2026-10-16

PASS for the supported opt-in lifecycle; manual operational acceptance remains open.

## Automated verification

- Full isolated PostgreSQL suite: 523 passed, 0 failed/skipped, 71 files.
- Typecheck: npm run typecheck -- --pretty false; passed.
- Frontend/PWA/server production build: npm run build; passed. Existing large
  chunk advisory remains; no new dependency.
- New lifecycle unit coverage: completeness, shared packing counts, unchanged
  quantities, authentication/status errors and no replay after uncertain failure.
- HTTP/PostgreSQL integration: flags, authentication, viewer and cross-tenant
  denial, strict payload, stale revision, concurrent/idempotent approval, provenance,
  second revision approval and unchanged old immutable snapshot. Unsupported reject
  route returns 404. Entire operational inventory/ledger/reservation rows unchanged.

Full suite command uses the existing .env.kit-builder-development and local TEMP:
node --env-file=.env.kit-builder-development node_modules/vitest/vitest.mjs run --reporter=dot

## Authenticated browser evidence

Standalone Edge automation: scripts/validate-studio-lifecycle.mjs, isolated local
PostgreSQL port 55432 and synthetic organization only. In-app browser was
unresponsive; no successful in-app run is claimed.

- Explicit save/reopen, warning navigation/focus, Science/Mathematics and complete
  set preview, keyboard dialog entry/cancel/Escape/focus return, approval refresh,
  duplicate prevention, approved provenance, comparison and continuing draft pass.
- Desktop 1440x1000, tablet viewport 768x1024 and reflow 390x844: scoped Studio axe
  audits each 26 passes, zero violations and zero incomplete checks; zero page errors.
- Studio scroll/client widths: 1120/1120, 448/448 and 366/366; 3370 DOM nodes.
- Complex fixture: 2 subjects, 6 grades, 60 activities, 364 material rows and 18
  packing locations, long labels and shared/common materials.
- Single local run: saved review load 627 ms; approval plus refresh 632 ms.
  These timings are observations, not production performance guarantees.
- Inventory items (12), stock ledger (20), reservations (5): before/after complete
  row fingerprints identical during browser lifecycle; no operational mutation.
- Flag-off browser rollback passes: hidden entry, rejected direct Studio navigation,
  preserved saved draft in legacy editor. Both local flags left off.

Ignored local evidence: .local-dev/ux-13f/browser-report.json,
desktop-review.png, desktop-confirmation.png, tablet-review.png,
reflow-review.png; rollback report .local-dev/ux-13e/rollback-report.json.
These are local review artifacts and are not committed.

## Limits and remaining gates

No physical tablet, staff workflow, screen reader or actual browser zoom signoff
is claimed. Axe covers the Studio region, not the surrounding application shell.
Earlier Milestone 12 readiness gates remain open. Unsupported rejection,
return-for-correction and separate draft cloning are disclosed in the UI. No live
company data, migration, main merge, deployment or Packing/QC work was performed.
