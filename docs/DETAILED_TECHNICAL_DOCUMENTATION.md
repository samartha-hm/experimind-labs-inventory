# ENTERPRISE INVENTORY MANAGEMENT SYSTEM (NexaInventory ERP)
## Comprehensive Technical Documentation & System Architecture

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Core Architecture & Technologies](#2-core-architecture--technologies)
3. [Authentication & Role-Based Access Control (RBAC)](#3-authentication--role-based-access-control-rbac)
4. [GitHub-Style Revision History & Diff Engine](#4-github-style-revision-history--diff-engine)
5. [System-Wide Undo / Redo Framework](#5-system-wide-undo--redo-framework)
6. [Database Schema & TypeORM Entities](#6-database-schema--typeorm-entities)
7. [REST API Specification](#7-rest-api-specification)
8. [Frontend State & Component Structure](#8-frontend-state--component-structure)
9. [Migration & Seed Engine](#9-migration--seed-engine)
10. [Maintenance & Best Practices](#10-maintenance--best-practices)

---

## 1. PROJECT OVERVIEW

**NexaInventory ERP** is an enterprise-grade supply chain, inventory, assembly kitting, and fulfillment management application modeled after high-end platforms like Zoho Inventory.

- **Primary Goal**: Complete operational independence with ZERO third-party Firebase dependency for core operations. All authentication, catalog management, assembly kitting, sales/purchase order fulfillment, partner management, and transaction audit trails function via an internal REST API server connected to PostgreSQL.
- **Key Modules**:
  1. **Items & Master Catalog**: Raw parts, common/unlimited parts (screws, wires), stock thresholds, bin mapping.
  2. **Composite Kits (BOM Assembly)**: Assembly kitting formula manager, capacity calculator, 1-click Pack/Unpack engine.
  3. **Sales & Fulfillment**: Sales orders, B2B customer directory, storefront order portal.
  4. **Purchases & Vendors**: Purchase orders, vendor directory, payment terms.
  5. **Warehouses & Bins**: Multi-warehouse facility management and storage bin locations.
  6. **Revision History (Commit Stream)**: System-wide audit log tracking exact red/green property diffs, commit metadata, author accounts, and roles.
  7. **Global Undo / Redo Framework**: Action stack supporting `Ctrl+Z` / `Ctrl+Y` and floating widget with explicit action labels.

---

## 2. CORE ARCHITECTURE & TECHNOLOGIES

```
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│     React + Vite        │       │    Express.js Backend   │       │   PostgreSQL Database   │
│   (Tailwind, Lucide)    │◄─────►│    (REST API & TypeORM) │◄─────►│    (Relational Store)   │
└─────────────────────────┘       └─────────────────────────┘       └─────────────────────────┘
            │                                  │
            ▼                                  ▼
┌─────────────────────────┐       ┌─────────────────────────┐
│ Global Undo/Redo Engine │       │  Local Account Security │
│  (Action History Stack) │       │   (JWT & Hashed Pass)   │
└─────────────────────────┘       └─────────────────────────┘
```

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, TypeScript.
- **Backend API**: Node.js 24+, Express.js, TypeORM, PostgreSQL (`pg`).
- **Data Transport**: RESTful JSON endpoints mapped under `/api/v1/*`.
- **Security**: Local JWT tokens with hashed password credentials; zero external Firebase runtime requirement.

---

## 3. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)

The security architecture enforces fine-grained access control across four distinct user roles:

| Role | Access Level | Permitted Operations |
|---|---|---|
| **Admin** | Full Control | All system operations, user management, item deletion, database seeding, configuration updates. |
| **Staff** | Operational | Catalog creation & updates, BOM customization, kit assembly/disassembly (Pack/Unpack), order processing. Cannot delete items/kits. |
| **User** | View-Only | View catalog, kit formulas, warehouses, and orders. Cannot modify database records. |
| **Intern** | Draft Only | Draft new records; restricted from finalizing transactions or deleting system records. |

### UI Protection (`RequireRole.tsx`)
UI components wrap restricted action buttons with `<RequireRole allowedRoles={['admin', 'staff']}>` to dynamically hide or disable forbidden controls based on the logged-in session.

---

## 4. GITHUB-STYLE REVISION HISTORY & DIFF ENGINE

Every mutation in NexaInventory records an audit commit to provide complete supply chain traceability.

### 1. Data Structure (`TransactionRecord`)
```ts
export interface TransactionRecord {
  id: string;
  timestamp: string; // ISO 8601
  type: 'pack' | 'add_stock' | 'adjust' | 'unpack';
  kitName?: string;
  kitQty?: number;
  description: string;
  userName?: string;
  userRole?: string;
  userId?: string;
  items: {
    componentId: string;
    componentName: string;
    qtyDiff: number;
  }[];
  diffs?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
}
```

### 2. Main Revision History Stream (`RevisionHistoryTab.tsx`)
- Located under the **AUDIT & LOGS** navigation menu.
- Renders a GitHub-style timeline of commits.
- **Author Attribution Badge**: Displays the author's full name, account role badge (e.g. `Guest Administrator` | `ADMIN`), and precise timestamp.
- **Visual Diff Viewer (`DiffViewer.tsx`)**: Displays property-level modifications using formatted red (`- old value`) and green (`+ new value`) diff blocks.

### 3. Inline Modal History Tabs
- **`EditPartModal.tsx`**: Features a *Revision History* tab displaying all historical property changes for that specific component.
- **`BOMCustomizerModal.tsx`**: Features a *Revision History* tab tracking kit formula changes, added/removed parts, and quantity revisions over time.

---

## 5. SYSTEM-WIDE UNDO / REDO FRAMEWORK

NexaInventory includes a global action stack managed by `UndoRedoContext.tsx`.

### 1. Operation Coverage
Undo and Redo (`Ctrl+Z` / `Ctrl+Y`) cover all primary entity mutations:
- **Inventory**: Creating, updating, and deleting items.
- **Composite Kits**: Creating kits, modifying BOM requirements, deleting kits, packing/unpacking kit sets.
- **Vendors & Customers**: Adding, editing, and removing partner directory entries.
- **Purchase & Sales Orders**: Creating, updating statuses, and deleting orders.
- **Warehouses & Bins**: Adding/editing facilities and storage bin locations.

### 2. Floating Undo/Redo Widget (`UndoRedoWidget.tsx`)
Located in the bottom-right corner of the interface:
- Explicitly names the pending action (e.g. `Undo: Update Wash bottles`, `Redo: Add Vendor Acorn`).
- Shows shortcut helpers (`Ctrl+Z` / `Ctrl+Y`).
- Features real-time spinner feedback while executing asynchronous undo/redo network calls.

---

## 6. DATABASE SCHEMA & TYPEORM ENTITIES

The system uses TypeORM with PostgreSQL relational entities:

- **`InventoryItem` (`inventory_items`)**: `id` (UUID), `name`, `sku`, `category`, `stock_qty`, `unit`, `is_common`, `threshold`, `image_url`, `base_price`, `description`, `bin_location`.
- **`Kit` (`kits`)**: `id` (UUID), `name`, `description`, `image_url`, `created_at`, `updated_at`.
- **`KitBom` (`kit_boms`)**: `id`, `kit_id`, `inventory_item_id`, `quantity`.
- **`Vendor` (`vendors`)**: `id`, `vendor_code`, `name`, `contact_name`, `email`, `phone`, `payment_terms`, `address`.
- **`Customer` (`customers`)**: `id`, `customer_code`, `name`, `contact_name`, `email`, `phone`, `credit_limit`, `billing_address`.
- **`PurchaseOrder` (`purchase_orders`)**: `id`, `po_number`, `vendor_id`, `order_date`, `expected_date`, `status`, `total_amount`.
- **`SalesOrder` (`sales_orders`)**: `id`, `so_number`, `customer_id`, `order_date`, `required_date`, `status`, `total_amount`.
- **`Warehouse` (`warehouses`)**: `id`, `code`, `name`, `address`, `is_default`.
- **`Bin` (`bins`)**: `id`, `code`, `warehouse_id`, `description`.
- **`Transaction` (`transactions`)**: `id`, `type`, `description`, `occurred_at`, `lines`.

---

## 7. REST API SPECIFICATION

All endpoints return JSON and adhere to standard HTTP status codes:

- `GET /api/v1/inventory` - List all inventory items
- `POST /api/v1/inventory` - Create inventory item
- `PUT /api/v1/inventory/:id` - Update inventory item properties
- `DELETE /api/v1/inventory/:id` - Delete item
- `GET /api/v1/kit` - List all composite kits and BOM requirements
- `POST /api/v1/kit` - Create composite kit
- `PUT /api/v1/kit/:id` - Update kit metadata and BOM items
- `DELETE /api/v1/kit/:id` - Delete kit
- `POST /api/v1/transaction` - Log inventory stock transaction / revision commit
- `GET /api/v1/vendor`, `POST /api/v1/vendor`, `PUT /api/v1/vendor/:id`, `DELETE /api/v1/vendor/:id`
- `GET /api/v1/customer`, `POST /api/v1/customer`, `PUT /api/v1/customer/:id`, `DELETE /api/v1/customer/:id`
- `GET /api/v1/purchase-order`, `POST /api/v1/purchase-order`, `PUT /api/v1/purchase-order/:id`, `DELETE /api/v1/purchase-order/:id`
- `GET /api/v1/sales-order`, `POST /api/v1/sales-order`, `PUT /api/v1/sales-order/:id`, `DELETE /api/v1/sales-order/:id`
- `GET /api/v1/warehouse`, `POST /api/v1/warehouse`, `PUT /api/v1/warehouse/:id`, `DELETE /api/v1/warehouse/:id`
- `GET /api/v1/bin`, `POST /api/v1/bin`, `DELETE /api/v1/bin/:id`

---

## 8. FRONTEND STATE & COMPONENT STRUCTURE

```
src/
├── App.tsx                     # Main App layout & tab router
├── DataContext.tsx             # Global state provider & REST API fetchers
├── AuthContext.tsx             # Local auth provider & role management
├── types.ts                    # TypeScript interfaces
├── components/
│   ├── DiffViewer.tsx          # Red/green property diff viewer
│   ├── UndoRedoWidget.tsx      # Floating Undo/Redo widget with labels
│   ├── RequireRole.tsx         # RBAC UI enforcement wrapper
│   └── Login.tsx               # Standard login & registration screen
├── features/
│   ├── dashboard/              # Overview KPI dashboard
│   ├── inventory/              # Items & Catalog (EditPartModal)
│   ├── kitting/                # Composite Kits & BOM (BOMCustomizerModal)
│   ├── history/                # System Revision History & Commit Stream
│   ├── procurement/            # Purchase Orders
│   ├── sales/                  # Sales Orders
│   ├── partners/               # Vendors & Customers
│   ├── warehouse/              # Warehouses & Bins
│   ├── storefront/             # Storefront Order Portal
│   └── copilot/                # AI Supply Chain Assistant
└── shared/
    ├── components/             # Header, Sidebar
    └── layout/                 # Layout wrappers
```

---

## 9. MIGRATION & SEED ENGINE

- Data seeding is handled via the internal backend migration tool or via the **Seed Database** option in the Admin settings.
- Initial CSV dataset files (`Assets.csv`, `Orders.csv`, `Settings.csv`, `Users.csv`) are mapped directly to PostgreSQL database entities upon initial initialization.

---

## 10. MAINTENANCE & BEST PRACTICES

1. **Linting & Type Safety**: Always verify code changes with `npm run lint` (`tsc --noEmit`).
2. **Transaction Logging**: Any new entity mutation function added to `DataContext.tsx` must call `logTransaction` to append a commit record with diffs and user metadata.
3. **Undo Stack Registration**: New mutation handlers should register an undo/redo action via `addAction({ id, name, undo, redo })` to preserve global Ctrl+Z support.