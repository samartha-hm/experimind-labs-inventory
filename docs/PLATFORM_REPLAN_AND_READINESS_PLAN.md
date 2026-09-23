# Experimind Labs Inventory Platform
## Current-State Assessment, Target Product Plan, and Readiness Roadmap

**Document status:** Approved plan with verified production readiness update
**Prepared:** 2026-09-23
**Repository:** `samartha-hm/experimind-labs-inventory`
**Production host:** AWS EC2 `13.233.142.180`
**Scope:** Product simplification and operational core rebuild

---

## 1. Executive decision

The platform should become a focused inventory operations product rather than a broad ERP/WMS showcase. Its job is to help people answer four questions and complete four corresponding workflows:

1. **What stock do we have, where is it, and can it be used?**
2. **What is low, what has been ordered, and when will it arrive?**
3. **What must be picked, packed, and dispatched, and what is blocked?**
4. **Can a Prastuti or similar kit be prepared completely and accurately?**

The target is not a smaller collection of hidden modules. The target is a coherent, role-based product with a small visible navigation, one auditable stock flow, and guided work queues. Prastuti remains an important project workflow built on the inventory and fulfillment core; it is not the identity of the entire platform.

The approved target roles are:

- **Admin:** operational oversight, users, permissions, configuration, audit.
- **Inventory Staff:** items, locations, receiving, movements, replenishment, counts.
- **Project Staff:** projects, kit/BOM readiness, shortages, preparation, labels, packing, dispatch status.

Backend authorization now preserves existing user records through explicit aliases:

| Canonical role | Supported legacy aliases | Operational boundary |
|---|---|---|
| Admin | `admin`, `super_admin` | Full operational and administration access |
| Inventory Staff | `staff`, `manager`, `editor`, `warehouse_staff`, `procurement` | Receiving, stock adjustment, transfers, replenishment execution, and fulfillment |
| Project Staff | `viewer`, `observer`, `guest`, `employee`, `member`, `user`, `intern` | Read operational data and create draft replenishment requests; cannot approve/send requests, receive, adjust, transfer, pick, pack, or dispatch |

The alias policy is intentionally reversible. It avoids rewriting historical role
data until route-level authorization and production fixtures have been verified.

Only the following product areas remain in scope:

- Inventory
- Locations and bins
- Stock movements and receiving
- Replenishment and supplier follow-up
- Fulfillment: reservation, picking, packing, dispatch, returns
- Kits/BOMs
- Projects and Prastuti preparation
- Users and roles
- Operational reports
- Optional storefront channel

AI/copilot, finance/GST, QMS, hardware engineering, warehouse visualization, and automations are not part of the target user-facing product. Their UI, routes, and related code should be removed only after data dependencies and production behavior are verified.

---

## 2. Current platform: verified state

### 2.1 Repository and runtime

The current codebase is a monorepo-style application with:

| Layer | Current implementation |
|---|---|
| Main frontend | React 19, Vite, TypeScript |
| Main backend | Express, Node.js, TypeScript |
| Database | PostgreSQL through TypeORM |
| Main storefront | Separate Next.js application under `apps/storefront` |
| Styling | Tailwind CSS v4 and shared design tokens |
| Authentication | JWT access authentication, refresh/session support, tenant scoping |
| Validation/security | `class-validator`, Helmet, CORS, rate limiting |
| Real-time | Server-Sent Events |
| Barcode | `zxing-wasm`, `html5-qrcode`, JsBarcode, GS1-related utilities |
| Deployment | PM2 and Nginx on AWS EC2 |
| Testing | Vitest; TypeScript typecheck |

Primary commands:

```text
npm test
npm run typecheck
npm run build
npm --prefix apps/storefront run build
npm run db:migrate
```

### 2.2 Current production status

The verified release is published to GitHub `main` at commit `e784fe6`
(`chore(deps): remove unused zxing packages`) and is deployed to AWS.

The following production checks passed on 2026-09-23:

- `experimind-inventory` PM2 process is online.
- `experimind-storefront` PM2 process is online.
- Public `/health` returns HTTP 200.
- Public `/` returns HTTP 200.
- Unauthenticated internal hard-lock checkout returns HTTP 401.
- Database migrations report zero pending migrations.
- Admin bootstrap and real inventory seeding complete successfully.
- The unused `@zxing/browser` and `@zxing/library` packages are absent from
  the deployed dependency tree and lockfile.
- The verified PostgreSQL backup remains present on the server.
- A restore rehearsal completed successfully in an isolated temporary database
  with 50 public tables; the temporary database was removed afterward.
- AWS root disk usage is approximately 88% with approximately 939 MB free.

Local verification for this release also passed:

- 41 test files and 193 tests.
- TypeScript typecheck.
- Main production build.
- Storefront production build.
- Clean Git working tree after the release was pushed.

The platform is operational and ready for current inventory workflows. The
remaining readiness work is hardening and scope reduction rather than a
deployment blocker.

### 2.3 Current visible product

The application currently has:

- Operations overview.
- Projects & Prastuti.
- Preparation work queue.
- Labels and verification.
- Items and stock.
- Kit assembly.
- Warehouses and bins.
- Stock transfers.
- Purchase orders.
- Sales and dispatches.
- Suppliers and schools.
- Role-filtered navigation and a focused Operations workspace.

Earlier versions exposed many of the areas the new plan intends to remove or
retire, including:

- Predictive analytics and AI assistant.
- Hardware workbench and PCBA/CAD.
- Warehouse floor plan, heatmap, 3D view, and floor operator mode.
- Quality suite, tax invoices, approvals, compliance, valuation, and audit screens.
- Automations and other specialist features.

The generic `More tools` navigation has since been removed. Role-filtered
navigation and the focused Operations workspace now expose the core workflows.
Specialist backend routes and data structures remain in the repository until
dependency mapping and production evidence support reversible retirement.

### 2.4 Current backend surface

The Express server currently mounts a broad API surface. Relevant operational routes include:

- `/api/v1/inventory`
- `/api/v1/warehouse`
- `/api/v1/bin`
- `/api/v1/kit`
- `/api/v1/vendor`
- `/api/v1/purchase-order`
- `/api/v1/sales-order`
- `/api/v1/transaction`
- `/api/v1/report`
- `/api/v1/users`
- `/api/v1/rbac`
- `/api/v1/stock-ledger`
- `/api/v1/wms`
- `/api/v1/projects`
- `/api/v1/production`
- `/api/v1/stickers`
- `/api/v1/storefront`

The server also mounts specialist routes for QMS, hardware, e-signatures, audit-event verification, warehouse visualization, and related capabilities. They must be classified before removal because some audit, authentication, or stock behavior may be shared by the core.

### 2.5 Current data and domain strengths to preserve

The existing platform has valuable foundations that should not be discarded:

- PostgreSQL persistence and TypeORM migrations.
- Tenant-aware authentication and authorization.
- Immutable or ledger-oriented stock movement behavior.
- Warehouse, bin, lot, serial, transfer, count, purchase, sales, kit, project, and sticker data.
- Existing Prastuti kit definitions and project deliverable data.
- Barcode scanning and label generation capabilities using the retained
  `zxing-wasm` implementation.
- Deployment, health endpoint, PM2, Nginx, and AWS runbooks.
- Existing tests for stock, RBAC, audit, barcode, and domain utilities.

These capabilities should be reused when they support the target workflows. “Remove from product” does not mean “rewrite working stock logic without evidence.”

---

## 3. Problems to solve

### 3.1 Product problems

- The navigation exposes too many concepts for daily inventory work.
- “More tools” hides rather than solves the information architecture problem.
- The product language mixes inventory, ERP, compliance, hardware, AI, and warehouse simulation.
- Users cannot immediately tell what requires action today.
- Inventory, replenishment, fulfillment, and project preparation are not presented as one connected lifecycle.
- Specialist features compete with the essential workflow.
- The existing documentation overstates the product as enterprise-ready in areas that still need operational proof.

### 3.2 Operational problems

- Low-stock work needs a simple, trackable request lifecycle.
- Partial delivery and backorder behavior must be explicit.
- Available, reserved, incoming, unavailable, and shortage quantities must be visually distinct.
- Fulfillment must share the same stock truth as inventory.
- Project preparation must create actionable shortages, not only display readiness counts.
- Stock mutations need consistent permissions and audit behavior across every surface.
- The platform needs end-to-end verification of the real operator journeys, not only unit tests.

### 3.3 Technical risks

- Deleting specialist code before dependency mapping could break shared services or routes.
- Existing local-storage project behavior may not yet be equivalent to the production database lifecycle.
- The current frontend bundle is large and may slow warehouse/mobile workflows.
- `npm audit` still reports nine vulnerabilities (six moderate and three high);
  these require individual review rather than a broad automatic upgrade.
- Existing deployment and environment secrets need a formal rotation and secret-management plan.
- Database data migration must be reversible and backed up before schema changes.

---

## 4. Target product model

### 4.1 Visible navigation

The target navigation is intentionally small:

```text
Home
Inventory
Replenishment
Fulfillment
Projects & Prastuti
Reports
Admin (role-gated)
```

The product should not use a generic “More tools” bucket for ordinary operations. If a feature is core, it belongs in one of the named workspaces. If it is not core, it is removed from the user-facing product.

### 4.2 Role-based home screens

#### Admin

- Open operational exceptions.
- Low stock and overdue replenishment.
- Orders blocked in fulfillment.
- Project readiness and dispatch risks.
- User and role administration.
- Audit access for operational changes.

#### Inventory Staff

- Receiving queue.
- Low-stock queue.
- Incoming deliveries and overdue supplier follow-ups.
- Stock by location/bin.
- Movement and count tasks.
- Scan-first actions.

#### Project Staff

- Active projects and due dates.
- Kit readiness by project.
- Shortages and replenishment status.
- Preparation queue.
- Label, packing, and dispatch verification.

### 4.3 One inventory equation

For each item and location:

```text
available = physical - reserved - unavailable
```

The UI must distinguish:

- **Physical:** physically recorded stock.
- **Reserved:** committed to an order or project.
- **Available:** safe to allocate.
- **Incoming:** ordered but not received.
- **Unavailable:** quarantine, damage, expiry, or other non-usable state.
- **Shortage:** required quantity greater than allocatable quantity.

### 4.4 Stock ledger commands

All stock-changing actions should use a single validated command path and immutable movement records:

```text
RECEIVE
RESERVE
RELEASE_RESERVATION
PICK
PACK
DISPATCH
TRANSFER_OUT
TRANSFER_IN
ADJUST
RETURN
SCRAP
COUNT_VARIANCE
```

Commands must be transactional, permission-checked, idempotent where retried, and auditable with actor, reason, source workflow, timestamp, and affected location.

### 4.5 Replenishment workflow

```text
Low stock detected
→ create replenishment request
→ assign supplier and expected date
→ ordered
→ in transit
→ partial delivery or backorder
→ receive delivered quantity
→ update remaining quantity
→ close when fully received or explicitly cancelled
```

Required behavior:

- Multiple partial receipts.
- Remaining quantity visible at all times.
- Overdue expected-date indicators.
- Supplier follow-up notes and timestamps.
- Receiving updates stock through the same ledger.
- A project or order shortage can link to the replenishment request.

### 4.6 Fulfillment workflow

```text
Demand created
→ reserve stock
→ pick
→ pack
→ verify
→ dispatch
→ close
```

Required exception states:

- Insufficient stock.
- Reservation expired or released.
- Partial pick.
- Damaged or missing item.
- Substitution requiring approval.
- Backorder.
- Return or dispatch correction.

### 4.7 Projects and Prastuti workflow

```text
Choose project and kit/BOM
→ calculate requirements
→ compare stock and incoming quantities
→ reserve available items
→ create linked shortage/replenishment work
→ prepare materials
→ verify labels
→ pack
→ dispatch
```

The same workflow must support Prastuti and other similar kits. Project-specific data should describe the demand and preparation context; inventory remains the source of truth for quantities and movements.

---

## 5. Target technical architecture

### 5.1 Architectural approach

Use the current React/Vite/Express/PostgreSQL foundation and reorganize it into clear operational modules. Do not introduce microservices, Kafka, or a separate event-sourcing product before scale requires them.

Use:

- PostgreSQL transactions for stock commands.
- Append-only movement records plus read projections.
- Type-safe service boundaries.
- REST APIs retained initially for migration safety.
- Role enforcement in the API and UI.
- Background jobs only for reminders, low-stock evaluation, and report generation.
- Playwright for critical browser workflows.

### 5.2 Domain boundaries

```text
Identity & Access
Inventory
Locations
Stock Ledger
Replenishment
Fulfillment
Kits/BOMs
Projects
Reporting
Storefront adapter
```

Cross-cutting services:

- Audit logging.
- Notifications.
- Barcode/scan parsing.
- File/document handling.
- Error handling and structured logging.

### 5.3 Data model direction

The target schema should have explicit relationships for:

- `items`
- `locations` and `bins`
- `stock_balances`
- `stock_movements`
- `reservations`
- `replenishment_requests`
- `replenishment_lines`
- `receipts`
- `suppliers`
- `orders`
- `order_lines`
- `fulfillment_tasks`
- `kits`
- `kit_lines`
- `projects`
- `project_requirements`
- `project_preparation_tasks`
- `labels`
- `users`, `roles`, and `permissions`
- `audit_events`

Existing entities should be mapped to this target before creating duplicate tables. Migrations must include indexes, uniqueness rules, foreign keys, and constraints that prevent invalid stock states.

---

## 6. What must be built

### Phase 0 — Baseline and safety

**Goal:** Make the current system measurable and safe to change.

- Inventory current routes, components, entities, migrations, and shared services.
- Separate core, supporting, and retire candidates.
- Capture production database backup and restore evidence.
- Define migration rollback procedure.
- Establish role fixtures and test data.
- Add a product capability registry so removed routes cannot be reached accidentally.

**Expected outputs:**

- Route and component dependency map.
- Data migration inventory.
- Production backup/restore record.
- Core acceptance-test fixtures.
- Approved deletion list.

### Phase 1 — Core shell and permissions

**Goal:** Replace the navigation model without changing stock behavior.

Likely files:

- `src/App.tsx`
- `src/shared/components/Sidebar.tsx`
- `src/shared/components/MobileBottomNav.tsx`
- `src/contexts/AuthContext.tsx`
- `src/routes/v1/rbac.ts`
- new role/workspace helpers under `src/features/core/`

Tests:

- Role-to-workspace visibility.
- Route denial for unauthorized roles.
- Mobile navigation parity.

Verification:

```text
npm test -- --run
npm run typecheck
```

### Phase 2 — Inventory truth

**Goal:** Make item, location, availability, movements, receiving, and counts consistent.

Likely areas:

- `src/routes/v1/inventory.ts`
- `src/routes/v1/warehouse.ts`
- `src/routes/v1/bin.ts`
- `src/routes/v1/transaction.ts`
- `src/routes/v1/stock-ledger.ts`
- `src/services/`
- database migrations under `src/migration/`
- inventory and warehouse feature components

Tests:

- Transactional receive, transfer, adjustment, and count variance.
- Available quantity formula.
- Negative stock prevention.
- Idempotent retry.
- Permission and audit coverage.

Verification:

```text
npm test -- --run
npm run typecheck
npm run db:migrate
```

### Phase 3 — Replenishment

**Goal:** Deliver the simple low-stock-to-received workflow.

Likely new/changed areas:

- `src/routes/v1/replenishment.ts`
- replenishment entities and migrations
- inventory alert services
- supplier and receiving components
- notifications/reminder service

Tests:

- Low-stock request creation.
- Supplier and expected-date tracking.
- Partial delivery.
- Backorder balance.
- Overdue request.
- Closing and cancellation.

Verification:

```text
npm test -- --run
npm run typecheck
```

### Phase 4 — Fulfillment

**Goal:** Connect reservations, picking, packing, dispatch, and returns to the stock ledger.

Likely areas:

- `src/routes/v1/sales-order.ts`
- `src/routes/v1/orders.ts`
- `src/routes/v1/wms-operations.ts`
- fulfillment services and components
- reservation services

Tests:

- Reservation concurrency.
- Release on cancellation.
- Partial pick and backorder.
- Pick/pack/dispatch ledger entries.
- Return and correction.

Verification:

```text
npm test -- --run
npm run typecheck
```

### Phase 5 — Projects and Prastuti

**Goal:** Make project preparation a guided demand-and-fulfillment workflow.

Likely areas:

- `src/routes/projectRoutes.ts`
- `src/routes/productionRoutes.ts`
- `src/routes/stickerRoutes.ts`
- `src/features/projects/`
- `src/features/production/`
- `src/features/stickers/`
- `src/data/prastutiKitsData.ts`
- `src/utils/projectReadiness.ts`

Tests:

- BOM requirement calculation.
- Quantity scaling by batch/class.
- Stock and incoming comparison.
- Linked shortage creation.
- Reservation and release.
- Preparation, label, packing, and dispatch state transitions.

Verification:

```text
npm test -- --run
npm run typecheck
npm run build
```

### Phase 6 — Retire non-core product surface

**Goal:** Remove unwanted features only after dependency verification.

Candidate areas include:

- AI/copilot UI and routes.
- QMS UI and routes.
- Finance/GST UI and routes.
- Hardware/PCBA UI and routes.
- Warehouse visualization UI and routes.
- Automations UI and routes.
- Specialist service dependencies that are no longer referenced.

Required controls:

- Search all imports and route registrations before deletion.
- Preserve migration history and production data unless explicitly approved for deletion.
- Remove navigation, API registration, lazy imports, tests, and documentation together.
- Run a route smoke test to confirm retired URLs return a controlled not-found/disabled response.
- Keep a reversible Git tag before each deletion batch.

### Phase 7 — Production readiness

**Goal:** Prove the simplified product is safe for real operation.

- Playwright smoke suite for each role.
- Mobile scan test.
- Replenishment partial-receipt test.
- Fulfillment reservation/dispatch test.
- Prastuti project readiness-to-dispatch test.
- Database backup and restore rehearsal.
- Security review and permission matrix review.
- Performance budget and bundle review.
- AWS staged deployment and rollback rehearsal.
- User acceptance test with real operators.

---

## 7. Definition of ready

The platform is ready for general use only when all of the following are true:

### Product

- No unrelated specialist features are visible or routable.
- Each role lands on a useful action-oriented workspace.
- Core navigation is understandable without training documentation.
- All important states have clear next actions.

### Inventory

- Physical, reserved, available, incoming, and unavailable quantities are correct.
- Every mutation creates a traceable ledger entry.
- Negative stock and duplicate retries are prevented.
- Receiving, transfers, counts, and adjustments are tested.

### Replenishment

- Low-stock items create actionable requests.
- Supplier, expected date, overdue, partial delivery, and backorder states work.
- Receiving updates inventory and linked demand correctly.

### Fulfillment

- Reservation prevents overselling.
- Pick, pack, dispatch, return, and exception states are accurate.
- Orders and project kits use the same stock truth.

### Projects

- Prastuti and similar kits use reusable BOM/project templates.
- Shortages link to replenishment.
- Preparation, labels, packing, and dispatch status are visible.
- Project completion cannot be marked ready while required work is unresolved.

### Security and reliability

- API permissions match workspace permissions.
- Production secrets are not stored in source.
- Backups are tested, not merely configured.
- Health checks, logs, and rollback are documented.
- Critical workflows have end-to-end evidence.

---

## 8. Immediate next work package

The production baseline and restore rehearsal are complete. The next cycle is
focused hardening and controlled scope reduction:

1. Add end-to-end workflow coverage for low stock, replenishment approval,
   partial receipt/backorder, project readiness, reservation, and dispatch.
2. Build the route/component/entity dependency inventory and classify specialist
   surfaces as **retain**, **simplify**, **merge**, or **retire**.
3. Review the nine npm audit findings individually and apply only safe,
   tested upgrades.
4. Reduce the main frontend bundle and resolve the mixed static/dynamic
   `DispatchPdfService` import.
5. Establish backup rotation, disk monitoring, and an AWS rollback rehearsal.
6. Retire specialist user-facing routes in reversible batches after dependency
   and acceptance evidence is recorded.

No production data should be deleted during this phase. No specialist code
should be removed until the dependency map and rollback evidence exist.

---

## 9. Success metrics

Measure the replan against operational outcomes:

- Time to find an item and its available quantity.
- Time to record a receipt.
- Time to create and update a replenishment request.
- Percentage of orders/projects blocked by unknown stock state.
- Reservation accuracy under concurrent demand.
- Percentage of partial deliveries correctly reflected.
- Time from project creation to readiness decision.
- Number of navigation items visible to each role.
- Critical workflow test pass rate.
- Production error rate and rollback time.

The goal is not to maximize feature count. The goal is to make the correct inventory action obvious, safe, and auditable.

---

## 10. Decision log

- Prastuti is a first-class project workflow, not the entire platform.
- Inventory is the source of truth for physical and available stock.
- Replenishment includes partial deliveries and backorders.
- Fulfillment uses reservations and the same stock ledger.
- Initial roles are Admin, Inventory Staff, and Project Staff.
- Only core operations, reports, and optional storefront remain user-facing.
- Specialist features are removed from the product rather than hidden in “More tools.”
- The existing PostgreSQL/TypeScript foundation is retained.
- A phased rebuild is preferred over a risky rewrite.
- Production data is preserved and migrated safely.
