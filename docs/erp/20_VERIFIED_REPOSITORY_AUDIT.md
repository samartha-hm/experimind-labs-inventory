# VERIFIED SOURCE AUDIT — uploaded repository snapshot (2026-10-08)

## Source integrity and limitations
- Source: user-uploaded `experimind-labs-inventory-main.zip` (not a Git checkout; no `.git` metadata).
- 652 ZIP entries, including duplicate filename suffix `(1)` artifacts, 324 files under `src/`.
- Stack confirmed from `package.json`: React 19, Vite 6, Express 4, TypeORM 0.3, PostgreSQL, Vitest.
- The real source has been included in `repository/experimind-labs-inventory-main/` (along with one additive, isolated quantity engine and agent continuity files).
- No live PostgreSQL connection was made. We have **not** validated the live database, actual opening stock, customer records or deploy configuration.
- No full application build passed. `npm run typecheck` could not validate baseline because dependencies were not installed; errors start with missing `express` and `react` modules.

## Verified source references and dispositions
| Path | Verified behavior | Disposition |
|---|---|---|
| `package.json` | React/Vite/Express/TypeORM, migration/build/test scripts | KEEP; add `test:erp-core` |
| `src/db.ts` | Explicit TypeORM entity and migration registration, `synchronize:false` | KEEP; extend with additive migrations |
| `src/entity/InventoryItem.ts` | Master item includes `name`, `description`, `quantity`, `reserved_quantity`, prices and electronics fields | KEEP for identity; treat only names/descriptions as trustworthy until verification |
| `src/entity/StockLocation.ts` | Stores location-specific quantity, allocated, reserved and quarantine values | RECONCILE with central ledger, no blind copying |
| `src/entity/StockLedger.ts` | Physical ledger movement schema | KEEP/reconcile; not known to match live physical stock |
| `src/services/StockLedgerService.ts` | Transactional ledger posting currently updates `InventoryItem.quantity` | REVIEW ledger/balance strategy before new stock posting |
| `src/entity/Kit.ts`, `src/entity/KitBom.ts` | Simple kit composition | MIGRATE to versioned kit templates, preserve original |
| `src/entity/BomNode.ts` | Manufacturing BOM independent of kit template | KEEP as manufacturing concept |
| `src/data/projectsDataset.ts` | `Project → classes → items`, batch multiplier, static initial projects | REFERENCE ONLY; unverified operational state |
| `src/services/ProjectManagementService.ts` | Static array and browser localStorage key `experimind_projects_portfolio_v2` | REPLACE with PostgreSQL-backed project domain |
| `src/routes/projectRoutes.ts` | Project CRUD, classes and work items, legacy QA signoff | REFACTOR; require authentication + tenant + authorization |
| `src/services/ProductionWorkflowService.ts` | localStorage-backed production items, batch calculations | REFACTOR to database production orders |
| `src/services/StickerTrackingService.ts` | localStorage-backed label manifests | REFACTOR as physical packing unit labels |
| `src/utils/prastutiTemplateEngine.ts` | XLSX parser and Prastuti-specific quantity defaults | REUSE ideas, not inferred values; parser defaults quantity to 1 and cost to 50 if blank, unsafe as authoritative master |
| `src/data/prastutiKitsData.ts` | Hardcoded demo-grade Prastuti items/stock values | KEEP ONLY AS EXAMPLE; never trust stock values |
| `src/routes/productionRoutes.ts`, `src/routes/stickerRoutes.ts` | Legacy endpoints | LOCK DOWN before production; migrate to authenticated APIs |
| `src/entity/CustomerOrder.ts`, `src/entity/SalesOrder.ts` | Separate order models | ASSESS channel-specific fields and consolidate carefully |
| `src/entity/PurchaseOrder.ts` | Existing purchasing base | KEEP; add demand-sourced requisition |
| `src/entity/QualityInspection.ts` | QC foundation | SIMPLIFY and integrate production/packing |
| `src/entity/FloorPlanLayout.ts`, `src/entity/PhysicalRack.ts` | Spatial visualization | DEFER from initial rollout |
| `apps/storefront/` | Separate storefront app | KEEP as channel with unified inventory |
| `scripts/seed_real_inventory.ts` | Reads old CSV and writes stock, price, fabricated warehouse location; also deletes visual tables | **DO NOT RUN**. Added explicit guard; not an inventory-master migration |
| `scripts/clear-demo-data.ts` | **TRUNCATES inventory_items and other records with CASCADE**, not just demo; deletes non-admin users | **DO NOT RUN**. Added explicit guard; only with backup and reviewed procedure |
| `.env.example`, `docker-compose.yml` | Example JWT secret, postgres/postgres, database port and Adminer published | HARDEN before deployment; example secrets are not production secrets |
| `AGENTS.md`, `.github/copilot-instructions.md`, `GEMINI.md` | Existing cross-IDE agent rules | PRESERVE; append links to revised ERP instructions |

## High-priority security fact
`server.ts` mounts `/api/v1/projects`, `/api/v1/production` and `/api/v1/stickers` without `authenticateJwt` or `requireTenant` unlike `/api/v1/inventory` and `/api/v1/purchase-order`. These endpoints also do not show consistent request authorization in their routers. **P0: protect before live deployment.** Audit `/api/v1/qc`, `/api/v1/traceability`, `/api/v1/e-signature`, `/api/v1/qms`, `/api/v1/audit-events`, and `/api/v1/stream` separately; some are also mounted without global guards.

## Inventory source assessment
`data/csv/Assets.csv` has 322 nonblank item names, only 31 nonblank descriptions, and four case-insensitive duplicate-name groups (two or three rows per name). Do not silently merge duplicate names, infer missing descriptions, trust source barcodes as canonical SKUs, or import numbers/locations/images as validated. A safe two-field candidate export is included for review at `source_data/inventory_master_candidates.csv`.

## Data priority
1. Real item names and actual descriptions — **trusted candidate fields**, pending de-dup and final name cleanup.
2. All other inventory fields including on-hand quantities, prices, supplier, bins, barcodes, reorder thresholds — **unverified**, must be re-established.
3. Workbook `SEP26 PRASTUTHI ASSEMBLY SOP and Items.xlsx` — **working draft needing correction**, do not release template version or procure against inferred quantities.
4. Project, production, stickers/demo datasets — **reference examples**, not live operational truth.

## Verified milestone
`src/domain/requirements/calculateProjectDemand.ts` is newly added, PURE and read-only. Tests live in `src/domain/requirements/__tests__/calculateProjectDemand.test.mjs`. It calculates multi-school requirements, site/grade common and universal crates, per-kit scaling, project-fixed materials, optional selections, per-site overrides, with explicit unknown stock and draft-template safety. It does not persist to PostgreSQL or change current UI, routes, stock, or migrations.
