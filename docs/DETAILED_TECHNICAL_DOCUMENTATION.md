# ENTERPRISE INVENTORY MANAGEMENT SYSTEM (NexaInventory ERP)
## Comprehensive Technical Documentation & System Architecture

---

## TABLE OF CONTENTS
1. [Project Overview](#1-project-overview)
2. [Core Architecture & Technologies](#2-core-architecture--technologies)
3. [Authentication & Role-Based Access Control (RBAC)](#3-authentication--role-based-access-control-rbac)
4. [CompAI Agentic Workflow & Human-in-the-Loop Engine](#4-compai-agentic-workflow--human-in-the-loop-engine)
5. [Global Command Palette (`Ctrl+K`)](#5-global-command-palette-ctrlk)
6. [Statistical Safety Stock & Reorder Point (ROP) Calculator](#6-statistical-safety-stock--reorder-point-rop-calculator)
7. [Supplier Quality & Performance Scorecard Radar](#7-supplier-quality--performance-scorecard-radar)
8. [Financial Inventory Valuation & COGS Hub](#8-financial-inventory-valuation--cogs-hub)
9. [Visual Supply Chain Pipeline Node Flowchart](#9-visual-supply-chain-pipeline-node-flowchart)
10. [ThermaPrint™ Barcode & QR Label Studio](#10-thermaprint-barcode--qr-label-studio)
11. [Automations & Webhooks Engine](#11-automations--webhooks-engine)
12. [GitHub-Style Revision History & Diff Engine](#12-github-style-revision-history--diff-engine)
13. [System-Wide Undo / Redo Framework](#13-system-wide-undo--redo-framework)
14. [Database Schema & TypeORM Entities](#14-database-schema--typeorm-entities)
15. [REST API Specification](#15-rest-api-specification)
16. [Frontend State & Component Structure](#16-frontend-state--component-structure)
17. [Migration & Seed Engine](#17-migration--seed-engine)
18. [Maintenance & Best Practices](#18-maintenance--best-practices)

---

## 1. PROJECT OVERVIEW

**NexaInventory ERP** is a Zoho-grade enterprise supply chain, inventory, assembly kitting, and fulfillment management application.

- **Primary Goal**: Complete operational independence with ZERO third-party Firebase dependency for core operations. All authentication, catalog management, assembly kitting, sales/purchase order fulfillment, partner management, and transaction audit trails function via an internal REST API server connected to PostgreSQL.
- **Key Modules**:
  1. **Executive Fulfillment Pipeline & Supply Chain Flow**: Visual node flowchart tracking inventory flow from suppliers to delivery.
  2. **Items & Master Catalog**: Raw parts, common/unlimited parts, stock safety thresholds, bin mapping.
  3. **Composite Kits (BOM Assembly)**: Assembly kitting formula manager, bottleneck calculator, 1-click Pack/Unpack engine.
  4. **Financial Valuation Hub**: Multi-currency (₹ INR / $ USD) FIFO Layering vs Moving Average valuation & COGS analytics.
  5. **CompAI Agentic Workflow**: Background task recommendation bar with Human-in-the-Loop approval safeguards and task log drawer.
  6. **Global Command Palette (`Ctrl+K`)**: Keyboard-driven spotlight search across SKUs, Kits, Orders, and system actions.
  7. **Statistical Safety Stock Calculator**: ROP formula calculator computing optimal buffers based on lead-time variance.
  8. **Supplier Performance Radar**: Vendor quality metrics (On-Time Delivery %, Lead Times, Defect Rates).
  9. **ThermaPrint™ Label Studio**: Thermal barcode/QR label generator with live thermal print preview.
  10. **Automations & Webhooks Engine**: Trigger rule manager with live Webhook POST test simulator.
  11. **Revision History (Commit Stream)**: System-wide audit log tracking exact red/green property diffs, commit metadata, author accounts, and roles.
  12. **Global Undo / Redo Framework**: Action stack supporting `Ctrl+Z` / `Ctrl+Y` and floating widget with explicit action labels.

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

- **Frontend**: React 18, Vite, Vanilla Tailwind CSS tokens, Lucide Icons, TypeScript.
- **Backend API**: Node.js 24+, Express.js, TypeORM, PostgreSQL (`pg`).
- **Data Transport**: RESTful JSON endpoints mapped under `/api/v1/*`.
- **Security**: Local JWT tokens with hashed password credentials; zero external Firebase runtime requirement. Storefront honeypot anti-bot security.

---

## 3. AUTHENTICATION & ROLE-BASED ACCESS CONTROL (RBAC)

The security architecture enforces fine-grained access control across four distinct user roles:

| Role | Access Level | Permitted Operations |
|---|---|---|
| **Admin** | Full Control | All system operations, user management, item deletion, database seeding, configuration updates. |
| **Staff** | Operational | Catalog creation & updates, BOM customization, kit assembly/disassembly (Pack/Unpack), order processing. Cannot delete items/kits. |
| **User** | View-Only | View catalog, kit formulas, warehouses, and orders. Cannot modify database records. |
| **Intern** | Draft Only | Draft new records; restricted from finalizing transactions or deleting system records. |

---

## 4. COMPAI AGENTIC WORKFLOW & HUMAN-IN-THE-LOOP ENGINE

Inspired by **CompAI CRM** ([trycompai/crm](https://github.com/trycompai/crm)):

1. **Top Agent Suggestion Bar (`AIAgentSuggestionBar.tsx`)**: Surfaces autonomous background agent recommendations (e.g. *Auto-Generate PO for Wash Bottles*, *Optimize Kit Assembly Batch*).
2. **Human Confirmation Safeguard**: Includes explicit **Confirm (Action)** and **Dismiss** buttons to ensure AI suggestions are never auto-applied without human approval.
3. **Background Agent Research Notebook (`AIAgentResearchDrawer.tsx`)**: Side drawer logging PostgreSQL row leases, scheduled task intervals (5 minutes), scanned stock thresholds, and evidence verification logs.

---

## 5. GLOBAL COMMAND PALETTE (`Ctrl+K`)

Mounted globally in `App.tsx` and triggered via `Ctrl+K` or search bar click:

- **Fuzzy Search Modal (`CommandPaletteModal.tsx`)**: Instant lookup across SKUs, Composite Kits, Sales Orders, Purchase Orders, and Vendors.
- **Shortcut Actions**: Jump directly to system tabs or launch creation modals.

---

## 6. STATISTICAL SAFETY STOCK & REORDER POINT (ROP) CALCULATOR

Integrated via `SafetyStockCalculatorModal.tsx`:

- **Formula-Driven Buffer**:
  $$\text{Safety Stock} = (\text{Max Daily Usage} \times \text{Max Lead Time}) - (\text{Avg Daily Usage} \times \text{Avg Lead Time})$$
  $$\text{Reorder Point (ROP)} = (\text{Avg Daily Usage} \times \text{Avg Lead Time}) + \text{Safety Stock}$$
- **1-Click Apply**: Updates the component safety threshold in real time with toast notifications.

---

## 7. SUPPLIER QUALITY & PERFORMANCE SCORECARD RADAR

Located in **Vendors Directory** under `PURCHASES & VENDORS`:

- **Scorecard Metrics**: Tracks On-Time Delivery Rate (`98.4% ★★★★★`), Average Lead Time (`4.2 Days`), Defect Rate, and payment terms.

---

## 8. FINANCIAL INVENTORY VALUATION & COGS HUB

Located under `INTELLIGENCE` ➔ `Financial Valuation`:

- **Valuation Methods**: Toggle dynamically between **FIFO Layering** (First-In, First-Out) and **Moving Average Costing**.
- **Multi-Currency Engine**: Instant conversion between **₹ INR** and **$ USD**.
- **COGS Analysis**: Calculates Total Asset Valuation, COGS breakdown, and turnover velocity.

---

## 9. VISUAL SUPPLY CHAIN PIPELINE NODE FLOWCHART

Embedded on the main Executive Dashboard (`SupplyChainPipeline.tsx`):

- Interactive SVG node flowchart mapping the supply chain pipeline:
  *Suppliers & Vendors ➔ Purchase Orders ➔ Warehouse & Bins ➔ Kitting Assembly ➔ Sales & Fulfillment ➔ Customer Delivery*

---

## 10. THERMAPRINT™ BARCODE & QR LABEL STUDIO

Launched via the `Barcode Scan` button in the top header (`BarcodeStudioModal.tsx`):

- Optical barcode/QR scanner simulator, SKU lookup, and thermal label generator (50mm x 25mm) with direct thermal print formatting.

---

## 11. AUTOMATIONS & WEBHOOKS ENGINE

Located under `INTELLIGENCE` ➔ `Automations & Webhooks` (`AutomationTab.tsx`):

- **Workflow Trigger Rules**: Configure rules for *Stock Shortage*, *Kit Packed*, *Order Created*, and *Vendor Added*.
- **Webhook POST Test Simulator**: Test webhook URLs with sample JSON payloads and inspect live HTTP responses (`HTTP 200 OK`).

---

## 12. GITHUB-STYLE REVISION HISTORY & DIFF ENGINE

Every mutation in NexaInventory records an audit commit to provide complete supply chain traceability.

- **Main Audit Log (`RevisionHistoryTab.tsx`)**: Renders a GitHub-style timeline of commits.
- **Author Attribution Badge**: Displays the author's full name, account role badge (e.g. `Guest Administrator` | `ADMIN`), and timestamp.
- **Visual Diff Viewer (`DiffViewer.tsx`)**: Displays property-level modifications using formatted red (`- old value`) and green (`+ new value`) diff blocks.

---

## 13. SYSTEM-WIDE UNDO / REDO FRAMEWORK

NexaInventory includes a global action stack managed by `UndoRedoContext.tsx`.

- **Floating Undo/Redo Widget (`UndoRedoWidget.tsx`)**: Explicitly names the pending action (e.g. `Undo (Ctrl+Z): Update Wash bottles`, `Redo (Ctrl+Y): Add Vendor Acorn`).
- Supports `Ctrl+Z` and `Ctrl+Y` hotkeys across Inventory, Kits, Partners, Orders, and Warehouses.

---

## 14. DATABASE SCHEMA & TYPEORM ENTITIES

The system uses TypeORM with PostgreSQL relational entities:

- `InventoryItem`, `Kit`, `KitBom`, `Vendor`, `Customer`, `PurchaseOrder`, `SalesOrder`, `Warehouse`, `Bin`, `Transaction`, `TransactionLine`, `User`, `Setting`.

---

## 15. REST API SPECIFICATION

Mapped under `/api/v1/*`:

- `GET/POST/PUT/DELETE /api/v1/inventory`
- `GET/POST/PUT/DELETE /api/v1/kit`
- `GET/POST/PUT/DELETE /api/v1/vendor`
- `GET/POST/PUT/DELETE /api/v1/customer`
- `GET/POST/PUT/DELETE /api/v1/purchase-order`
- `GET/POST/PUT/DELETE /api/v1/sales-order`
- `GET/POST/PUT/DELETE /api/v1/warehouse`
- `GET/POST/PUT/DELETE /api/v1/bin`
- `GET/POST /api/v1/transaction`

---

## 16. FRONTEND STATE & COMPONENT STRUCTURE

```
src/
├── App.tsx                     # Main App layout & tab router
├── DataContext.tsx             # Global state provider & REST API fetchers
├── AuthContext.tsx             # Local auth provider & role management
├── types.ts                    # TypeScript interfaces
├── contexts/                   # ToastContext, UndoRedoContext
├── components/                 # DiffViewer, UndoRedoWidget, ToastContainer
├── features/
│   ├── dashboard/              # Overview, Visual Supply Chain, Valuation
│   ├── inventory/              # Items & Catalog, SafetyStockCalculatorModal
│   ├── kitting/                # Composite Kits & BOM (BOMCustomizerModal)
│   ├── automation/             # Automations & Webhooks
│   ├── history/                # System Revision History & Commit Stream
│   ├── procurement/            # Purchase Orders
│   ├── sales/                  # Sales Orders
│   ├── partners/               # Vendors & Customers Directory
│   ├── warehouse/              # Warehouses & Bins
│   ├── storefront/             # Storefront Order Portal (Honeypot)
│   └── copilot/                # AI Supply Chain Assistant, Research Drawer
└── shared/
    ├── components/             # Header, Sidebar, CommandPaletteModal, BarcodeStudioModal
    └── layout/                 # Layout wrappers
```

---

## 17. MIGRATION & SEED ENGINE

- Data seeding is handled via the internal backend migration tool (`scripts/migrate_local.cjs`) or via Admin settings.
- Initial CSV datasets (`Assets.csv`, `Orders.csv`, `Settings.csv`, `Users.csv`) seed PostgreSQL automatically.

---

## 18. MAINTENANCE & BEST PRACTICES

1. **Linting & Type Safety**: Always verify code changes with `npm run lint` (`tsc --noEmit`).
2. **Transaction Logging**: Any new entity mutation function added to `DataContext.tsx` must call `logTransaction` to append a commit record with diffs and user metadata.
3. **Undo Stack Registration**: New mutation handlers should register an undo/redo action via `addAction({ id, name, undo, redo })` to preserve global `Ctrl+Z` support.

---

## 19. UNIFIED MASTER CATEGORIES STANDARD

To maintain complete taxonomy alignment across **NexaInventory ERP** (Items & Master Catalog, Composite Kits BOM, Predictive Analytics) and the **Experimind Storefront (`shop.experimindlabs.com`)**, the system enforces 12 core master categories with dedicated icons, badge themes, and real-time item counts:

| Category | Icon / Visual Theme | Target Products & Description |
|---|---|---|
| **ALL** | `LayoutGrid` (Indigo) | Complete catalog view & universal category filter. |
| **Prastuti Science** | `FlaskConical` (Emerald) | Laboratory glassware, test tubes, reagents & science experiment apparatus. |
| **Electronics** | `Cpu` (Indigo) | Microcontrollers, ESP32/Arduino modules, sensors & electronic components. |
| **Stationary** | `PenTool` (Amber) | Lab notebooks, blotting papers, pH indicator strips & stationery items. |
| **others** | `Package` (Slate) | General hardware, miscellaneous fittings & hardware accessories. |
| **Chemicals** | `Sparkles` (Rose) | Laboratory chemicals, solvents, indicator solutions & salts. |
| **Box** | `Box` (Blue) | Storage boxes, acrylic trays, bin containers & packaging materials. |
| **Prastuti Maths** | `Calculator` (Sky) | Mathematical visual aids, geometry modules & learning instruments. |
| **Anubhav** | `Award` (Purple) | Experiential learning modules & practical demonstration toolkits. |
| **kits** | `Wrench` (Teal) | Comprehensive STEM kit packages & assembly toolkits. |
| **IQNAAX** | `Lightbulb` (Yellow) | Cognitive puzzle toys, IQ development kits & logic games. |
| **Maths kits** | `Grid` (Cyan) | Specialized mathematics lab toolkits & manipulative sets. |