# P0 Implementation Gate — Verified Repository Plan

## Milestone A (implemented safely here)
1. Add `src/domain/requirements/calculateProjectDemand.ts` as a pure read-only calculation module.
2. Add a dependency-free Node test suite. `npm run test:erp-core` runs it (Node >=22.16 required for type stripping).
3. No database/entity/route changes. No automatic migration. No stock writes.
4. Keep draft Prastuti import provisional and stock unknown.

## Milestone B (next in coding IDE, NOT YET DONE)
1. Run `npm ci` in the restored repo, then `npm run typecheck`, `npm test`, and `npm run build` to establish baseline; record pre-existing failures.
2. Protect exposed `/api/v1/projects`, `/api/v1/production`, `/api/v1/stickers` routes with JWT + tenant + capability checks. Verify old UI uses correct auth before deployment; add unauthenticated 401, forbidden 403, tenant isolation tests.
3. Add `Project`, `ProjectSite`, `SiteGradeRequirement`, `KitTemplate`, `TemplateVersion`, `TemplateLine`, `DemandSnapshot`, `DemandSourceTrace` as **new tables** with additive TypeORM migrations. Never silently drop inventory tables or old project data.
4. Implement read-only DB-backed project + template APIs using the verified quantity engine. Draft templates may be previewed but not released to operations.
5. Implement human-reviewed import preview for existing item name/description records (only); no stock values imported.
6. Build UI: Project → Sites → Grades → Template draft preview → traceable demand → UNKNOWN stock readout.
7. Write an explicit cutover checklist for production data, stocktake, approved kit masters and file attachment backups.

## Milestone C (later)
- Verified physical stocktake and opening balances through locked transactions + ledger.
- Approved Prastuti master and versioned template release.
- Reservation, purchase requests, production and QC.
- School-aware packing labels, delivery batches, installation and proof of handover.
- Storefront as separate sales channel sharing stock truth, then finance.

## Guardrails
- Don't take the demo quantity from `src/data/prastutiKitsData.ts` or `src/data/productionDataset.ts` as production material requirement.
- Don't use `src/utils/prastutiTemplateEngine.ts` default qty=1 or unitCost=50 for live purchases.
- Don't create entries with same item ID and incompatible units; require UOM conversion or validation.
- Aggregate procurement quantities project-wide, but preserve per-school trace and independent deliveries.
- Don't drop/rename tables without backup, migration plan and explicitly reviewed rollback.
- No cloud secrets, production tokens, `.env`, keys or real database dumps in commits.
