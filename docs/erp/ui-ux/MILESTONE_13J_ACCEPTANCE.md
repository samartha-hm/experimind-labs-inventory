# Milestone 13J acceptance — 2026-10-17

Result: PASS for the bounded read-only implementation and desktop/tablet harness acceptance. Full development-server acceptance remains BLOCKED; this is not an unrestricted operational acceptance.

## Delivered and fidelity

Authenticated opt-in Projects/Schools navigation, saved school/subject/grade matrix, explicit Science complete-set quantities, independent Mathematics quantities, saved revision history, immutable kit approval provenance, authoritative material demand/stock/shortages and linked production, packing/QC, delivery, installation and completion evidence. School identities remain UUID-based. Missing quantities/evidence stay unknown; explicit zero remains zero. Historical snapshots do not masquerade as current demand.

Existing services validate tenant ownership and current database roles. Workspace routes accept GET/HEAD only, return private/no-store responses and guard mixed project revisions. No new calculations, schema, business mutations or operational transitions. Independent operational reads are not a globally atomic snapshot. Contract limits and rollback are in MILESTONE_13J_CONTRACT_MATRIX.md; proposed writes remain unimplemented in MILESTONE_13J_WRITE_PROPOSAL.md.

## Verification

- Focused React and HTTP/PostgreSQL: 16/16 (4 presentation/flag tests, 12 planning integration tests). Final presentation rerun: 4/4 after refresh recovery changes.
- Full suite: 537/537 tests, 74 files, maxWorkers=2 and 30-second test timeout. Typecheck and frontend/PWA/server builds passed; routine bundle-size warning remains.
- HTTP tests exercise unauthenticated, viewer, inactive/current-role and cross-tenant access, flag boundaries, mutation denial, revision conflicts, immutable versions and exact legacy service response equality.
- Six retained synthetic projects with two schools each reconcile workspace project/history/preview responses exactly to existing endpoints. Persisted Science grade/common/bundle and independent Mathematics rules are covered; unverified stock is not zero.
- All 83 public business-table count/content fingerprints, including audit logs, match before/after browser reads and flag-off rollback. Authentication user/session tables alone are excluded. No stock deduction, reservation change, QC approval, dispatch, requirement edit or business audit event was introduced.
- Actual flag-off harness restart: access reports disabled, workspace GET is 404, legacy project list is identical; browser displays legacy fallback. No migration or persisted environment flag.

## Browser and accessibility

Authenticated Edge, built frontend with existing routers against isolated loopback PostgreSQL: desktop 1280×720 and tablet 768×1024. Project selection, heading focus, keyboard school expansion, school filtering/empty results, historical revision selection and refresh passed. Distinct schools display different saved quantities; missing installation/production evidence remains explicit. A synthetic 403 and a dropped response show errors without claiming completion; retry reloads the retained project/revision.

Scoped axe WCAG A/AA/2.1 AA and best-practice audits at desktop/tablet: zero violations, zero incomplete checks, 31 passing rules each. Tablet has no horizontal overflow. Screenshots and reconciliation evidence are local ignored artifacts in `.local-dev/ux-13j/`: `desktop.png`, `tablet.png`, `tablet-school.png`, `rollback.png`, `reconciliation.json`, `verified.json`, `rollback.json`.

## Limits and pending acceptance

- The full Vite development server accepted requests but stalled responses/database acquisition. Direct database checks and the built-frontend unchanged-router harness worked; root cause remains unresolved. Browser results do not establish full-server acceptance.
- Exploratory 360px phone check found shell overflow (625px document width). Phone reflow is not passed; desktop/tablet acceptance does not cover it. The narrow screenshot is diagnostic only; its audit result was stale and is not counted.
- No independent school requirement draft/approval contract exists. Show saved requirements and kit approval provenance separately; do not infer school approval. No new approval UI.
- List limits (200) and history limit (50) are disclosed. Unlinked, forbidden or missing evidence cannot prove completion. Server delivery summary may represent the first school packing order; all-order readiness is not inferred.
- Browser coverage is representative, not every production/delivery state combination. Partial shortages and quantity variants are covered by synthetic service tests; exhaustive operational browser scenarios remain pending.
- Physical tablets, scanners, printers, staff and assistive devices were not tested. No deployment, main merge or company data changes.

Stop for review before project writes or another module.
