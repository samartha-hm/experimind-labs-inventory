# Target Technical Blueprint

## Architecture

Keep a **modular monolith**, initially preserve the verified existing React/Vite + Express/TypeScript + TypeORM/PostgreSQL stack (verify actual manifest/versions first). No framework rewrite merely for style. Domain services enforce invariants server-side; React is a presentation/client-state layer. Avoid microservices, a mandatory cloud queue, mandatory LLM or paid integrations.

```text
React/Vite UI — responsive desktop / warehouse mobile
     │
REST / OpenAPI + authentication and fine-grained authorization
     │
Modular application/domain services
     ├── Project & Survey
     ├── Template + Quantity Engine
     ├── Demand, Reservation, Stock Readiness
     ├── Purchasing
     ├── Production / Preparation
     ├── QC
     ├── Packing + Labels
     ├── Delivery + Setup
     └── Commercial Orders / Storefront channel
     │
PostgreSQL transactional source of truth
```

## Domain ownership

| Domain | Owns | Does not own |
|---|---|---|
| Items | SKU, UOM, item type, tracking rules | Physical balances |
| Stock | immutable movements, balances, lots/serials, location | Project requirements |
| Project | customer/internal objective, stage, site survey, tasks | Inventory mutations |
| Templates | versioned kit and packaging definitions | Project-specific edits |
| Demand engine | calculated project demand/explanation trace | Reservations, stock changes |
| Reservations | committed available physical stock | Inbound POs |
| Procurement | PR, PO, receipts | The inventory ledger itself |
| Production | BOM, input issue, output receipt, operations | Customer template customization |
| Packing | physical container hierarchy, content verification, labels | Purchasing decision |
| Delivery | batches, dispatch and setup records | Sales invoice GL |
| Commerce | quote, sales order, storefront channel | Independent inventory database |

## Principal entities (conceptual; final table names after fresh repository audit)

`Organization`, `User`, `Permission`, `RoleBundle` (optional), `Customer`, `Supplier`, `Item`, `UOM`, `Warehouse`, `Bin`, `Lot`, `Serial`, `StockMovement`, `StockBalance`, `Reservation`, `Project`, `SiteSurvey`, `SiteSurveyVersion`, `ProjectRequirementGroup`, `ProjectRequirement`, `ProjectDemandSnapshot`, `ProjectTask`, `TaskDependency`, `ProjectTemplate`, `KitTemplate`, `TemplateVersion`, `TemplateLine`, `QuantityRule`, `PurchaseRequest`, `PurchaseOrder`, `GoodsReceipt`, `ManufacturingBOM`, `ProductionOrder`, `Operation`, `MaterialConsumption`, `ProductionOutput`, `QualityInspection`, `PackingUnit`, `PackingLine`, `Label`, `DeliveryBatch`, `DeliveryLine`, `SetupTask`, `Quotation`, `SalesOrder`, `AuditEvent`.

**Separate quantity calculation from committed operational state:** demand can be recalculated/snapshotted/versioned; physical reservation, receipt, production and delivery should be event-based and reconciled against the latest approved plan. Avoid storing many editable copies of `totalQuantity`.

## Project lifecycle

Coarse **displayed stages**: LEAD, DISCOVERY, SITE_SURVEY, PLANNING, QUOTATION, CUSTOMER_APPROVAL, EXECUTION, READY_FOR_DELIVERY, DELIVERED, SETUP, COMPLETED; exception ON_HOLD/CANCELLED. This is a configurable phase checklist rather than a universally strict linear transition graph: some projects skip site survey or quote later. Require business guards for entering execution/closing, not every intermediate checkbox.

## Other state machines

- Requirements: DRAFT → ACTIVE → SUPERSEDED/CANCELLED, with fulfillment progress **derived** from stock/orders/packing.
- Purchase request: DRAFT → SUBMITTED → APPROVED/REJECTED → LINKED_PO → CLOSED/CANCELLED.
- PO: DRAFT → APPROVED/ORDERED → PARTIALLY_RECEIVED → RECEIVED/CLOSED/CANCELLED.
- Production: PLANNED → RELEASED → IN_PROGRESS → QC_PENDING → DONE / REWORK / CANCELLED.
- Packing unit: PLANNED → CREATED → CONTENTS_VERIFIED → SEALED → STAGED → DISPATCHED.
- Delivery batch: PLANNED → STAGED → DISPATCHED → RECEIVED → SETUP_COMPLETE/ACCEPTED.
- Reservation: ACTIVE → CONSUMED/RELEASED/CANCELLED.

## API sketch (derive names from real repo conventions)

```text
POST /api/projects
GET /api/projects/:id
PATCH /api/projects/:id
GET /api/kit-templates
POST /api/projects/:id/template-instances
GET /api/projects/:id/requirements
PATCH /api/projects/:id/requirements/:lineId
POST /api/projects/:id/recalculate-demand
GET /api/projects/:id/demand
GET /api/projects/:id/stock-readiness
```

All writes idempotent where retried, validated on server, authorized by capability, audited, and transaction-safe. Use API versioning when breaking old clients; never silently invalidate storefront integrations.

## Security & privacy

Password hashing, sensible sessions, optional TOTP, CSRF where cookie authentication, rate limiting, parameter validation, tenant/organization check even for single company, audit access. Sensitive site photographs/customer details need access controls. Never store secrets in version control; use environment variables and sample placeholders.

## Performance

Run requirement expansion in one domain call; aggregate item IDs and fetch available balances in bulk; avoid N+1 database queries. Add indexes by organization/item/location/project/status and optimized high-use searches. Cached read models allowed but not a second authoritative quantity.
