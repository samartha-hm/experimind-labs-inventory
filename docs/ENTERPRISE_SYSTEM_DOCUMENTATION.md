# NexaInventory ERP — Master Enterprise System Documentation
**Experimind Labs Enterprise Supply Chain, WMS, Financials & Governance Platform**
*Version: 2.5.0 SaaS | Production Release*

---

## 📑 TABLE OF CONTENTS
1. [Executive Summary & Technology Stack](#1-executive-summary--technology-stack)
2. [High-Level System Architecture](#2-high-level-system-architecture)
3. [Double-Entry Stock Ledger Engine](#3-double-entry-stock-ledger-engine)
4. [Warehouse Management System (WMS) & Digital Twin](#4-warehouse-management-system-wms--digital-twin)
5. [Inbound & Outbound Fulfillment Operations](#5-inbound--outbound-fulfillment-operations)
6. [Universal Barcode & Thermal Label Studio](#6-universal-barcode--thermal-label-studio)
7. [Universal Bulk CSV Catalog Importer](#7-universal-bulk-csv-catalog-importer)
8. [Role-Based Access Control (RBAC) & Active Sessions](#8-role-based-access-control-rbac--active-sessions)
9. [GST Calculation Engine & E-Invoicing (IRP)](#9-gst-calculation-engine--e-invoicing-irp)
10. [Zoho Books 2-Way Sync Engine](#10-zoho-books-2-way-sync-engine)
11. [Predictive Analytics & AI BI Engine](#11-predictive-analytics--ai-bi-engine)
12. [Comprehensive Database Schema & Migrations](#12-comprehensive-database-schema--migrations)
13. [REST API Specification](#13-rest-api-specification)
14. [Production Deployment & Infrastructure](#14-production-deployment--infrastructure)
15. [Custom Domain & HTTPS Setup Guide](#15-custom-domain--https-setup-guide)
16. [Local Development & Testing Workflows](#16-local-development--testing-workflows)

---

## 1. EXECUTIVE SUMMARY & TECHNOLOGY STACK

**NexaInventory ERP** is a full-featured, enterprise-grade inventory management, supply chain orchestration, assembly kitting, and warehouse management system developed specifically for **Experimind Labs**. It is completely self-hosted, independent of third-party runtime frameworks (such as Firebase), and runs on modern open-source foundations.

### 💻 Technology Stack

| Layer | Component | Technologies Used |
| :--- | :--- | :--- |
| **Frontend UI** | Client Application | **React 19**, **Vite 6**, **TypeScript 5.8**, **Tailwind CSS v4** (with custom dark mode variants), **Lucide React** icons. |
| **Data Visualization** | Charts & 3D Twin | **Recharts 2.15**, **Three.js** / WebGL 3D Canvas, HTML5 2D Canvas Blueprint Designer. |
| **Barcode & Imaging** | Scanner & Thermal Print | **ZXing-C++ WebAssembly**, **JsBarcode**, **jsPDF 2.5** (vector PDF label generation), **html2canvas**. |
| **Backend API** | Application Server | **Node.js 24+**, **Express.js 4.21**, **TypeORM 0.3.20** (Data Mapper ORM), TypeScript. |
| **Relational Database** | Database Store | **PostgreSQL 17** (Transactional ACID, UUID primary keys, JSONB capabilities, B-Tree indexes). |
| **Security & Auth** | Token & Hash Engine | **JSON Web Tokens (JWT)**, **bcryptjs** (salt rounds 10), Rate Limiting (`express-rate-limit`), Helmet headers. |
| **Production Runtime** | Hosting & Proxy | **AWS EC2** (Debian Linux aarch64 Graviton), **Nginx 1.22+**, **PM2** process supervisor. |
| **Testing Suite** | Unit & Integration | **Vitest 4.1**, Supertest, `@testing-library/react`. |

---

## 2. HIGH-LEVEL SYSTEM ARCHITECTURE

```
                                  [ INTERNET / CLIENTS ]
                                            │
                      ┌─────────────────────┴─────────────────────┐
                      ▼                                           ▼
          https://shop.experimindlabs.com            https://inventory.experimindlabs.com
          (Public Customer Storefront)               (Internal Enterprise ERP & WMS)
                      │                                           │
                      └─────────────────────┬─────────────────────┘
                                            │
                                            ▼
                          [ NGINX REVERSE PROXY (Port 80/443) ]
                               (SSL Termination, Gzip, SPA)
                                            │
                         ┌──────────────────┴──────────────────┐
                         ▼                                     ▼
                [ Static Web Assets ]                [ Express.js REST API ]
                   (Vite 6 /dist)                      (Port 3000 / PM2)
                                                               │
                                                               ▼
                                                    [ TypeORM Data Mapper ]
                                                               │
                                                               ▼
                                                  [ PostgreSQL 17 Database ]
                                                  (experimind_inventory DB)
```

---

## 3. DOUBLE-ENTRY STOCK LEDGER ENGINE

The **Double-Entry Stock Ledger** (`stock_ledger` table and [`StockLedgerService.ts`](file:///e:/experimindlabs/inventory/src/services/StockLedgerService.ts)) provides an immutable, append-only financial and physical audit log for all inventory movement.

### Core Principles
1. **Append-Only Immutability**: No rows in `stock_ledger` are ever edited or deleted. Corrective actions generate new offsetting entries.
2. **Running Balance Calculation**: Every record stores the exact stock balance after the transaction occurred, preventing race conditions.
3. **Transaction Types**:
   - `RECEIVE_PO`: Inbound receipts from supplier Purchase Orders.
   - `FULFILL_SO`: Outbound fulfillment to customer Sales Orders.
   - `STOCK_TRANSFER`: Inter-warehouse / inter-bin movements.
   - `KIT_ASSEMBLY_CONSUME`: Raw materials deducted during BOM assembly.
   - `KIT_ASSEMBLY_PRODUCE`: Finished kits added to available stock.
   - `CYCLE_COUNT_RECONCILIATION`: Discrepancy corrections from physical audits.
   - `MANUAL_ADJUSTMENT`: Supervised manager adjustments with mandatory reason codes (`DAMAGED_GOODS`, `OBSOLETE_EXPIRED`, `INTERNAL_RND_USE`, `INITIAL_OPENING_BALANCE`, `DONATION_PROMOTION`).
   - `RETURN_RECEIPT`: Customer returns restocked into quarantine or shelf bins.

---

## 4. WAREHOUSE MANAGEMENT SYSTEM (WMS) & DIGITAL TWIN

The platform provides a comprehensive spatial suite for physical warehouse modeling:

### 1. 2D Floor Plan Designer ([`FloorPlanDesignerTab.tsx`](file:///e:/experimindlabs/inventory/src/features/warehouse/components/FloorPlanDesignerTab.tsx))
- Interactive grid canvas with drag-and-drop elements:
  - **Storage Racks & High-Density Bays**
  - **Inbound Receiving Docks & Outbound Dispatch Bays**
  - **Kitting / Assembly Workstations & QA Inspection Tables**
  - **Forklift Traffic Aisles, Hazard Zones, and Emergency Exits**
- Real-time coordinate saving to PostgreSQL `floor_plan_layouts`.

### 2. 2D Storage Density Heatmap ([`WarehouseHeatmapTab.tsx`](file:///e:/experimindlabs/inventory/src/features/warehouse/components/WarehouseHeatmapTab.tsx))
- Color-coded bin utilization visualizer:
  - 🟢 **Optimal Stock** (30% – 70% capacity)
  - 🟡 **High Utilization / Congested** (70% – 95% capacity)
  - 🔴 **Over-capacity / Critical** (> 95% capacity)
  - ⚪ **Empty Bin** (Available for putaway slotting)

### 3. 3D WebGL Digital Twin ([`Warehouse3DDigitalTwin.tsx`](file:///e:/experimindlabs/inventory/src/features/warehouse/components/Warehouse3DDigitalTwin.tsx))
- Hardware-accelerated 3D spatial twin rendering multi-tier industrial racking, bay levels, and storage pallets with camera pan, zoom, and orbit controls.

### 4. Touchscreen Floor Operator Console ([`WarehouseFloorMode.tsx`](file:///e:/experimindlabs/inventory/src/features/warehouse/components/WarehouseFloorMode.tsx))
- High-contrast UI optimized for mobile scanners and tablet mounts.
- **Hardware Laser Barcode Listener**: Intercepts `Enter`-terminated keypresses from USB/Bluetooth handheld barcode scanners (`useBarcodeGunListener`).

---

## 5. INBOUND & OUTBOUND FULFILLMENT OPERATIONS

### Inbound Dock Receiving ([`POReceivingModal.tsx`](file:///e:/experimindlabs/inventory/src/features/procurement/components/POReceivingModal.tsx))
1. **3-Way Match Verification**: Compares Purchase Order line quantities with physical delivery counts.
2. **Partial Receiving Support**: Allows receiving in split shipments while keeping remaining line balances open.
3. **Automated Lot & Batch Tracking**: Assigns lot numbers with expiry dates for FEFO compliance.
4. **Putaway Slotting**: Assigns specific warehouse shelf bins (`A-01-01`).
5. **1-Click Thermal Label Printing**: Generates putaway barcode stickers immediately upon dock receipt.

### Outbound Fulfillment & Pick-Pack-Ship ([`SalesOrdersTab.tsx`](file:///e:/experimindlabs/inventory/src/features/sales/components/SalesOrdersTab.tsx))
1. **Guided Pick-Path Routing**: Sorts order lines by bin location to minimize walking distance in the warehouse.
2. **Barcode Scan Verification**: Operator scans item barcodes to verify correct SKU selection before packing.
3. **Courier Manifest & AWB Tracking**: Captures logistics provider (BlueDart, Delhivery, DTDC, FedEx) and generates outbound manifests.
4. **Automatic Stock Ledger Posting**: Deducts inventory and updates COGS valuation upon dispatch.

### Multi-Stage Stock Transfer Orders (STO) ([`StockTransferTab.tsx`](file:///e:/experimindlabs/inventory/src/features/warehouse/components/StockTransferTab.tsx))
- Complete 3-phase transfer lifecycle:
  1. `Draft`: Initiated by warehouse supervisor.
  2. `In-Transit`: Dispatched from source warehouse (stock removed from source available inventory).
  3. `Received & Slotted`: Confirmed at destination warehouse (stock added to destination bin).

### Cycle Counting & Blind Physical Audits ([`RevisionHistoryTab.tsx`](file:///e:/experimindlabs/inventory/src/features/history/RevisionHistoryTab.tsx))
- **Blind Counting Mode**: Hides system balances from auditors to eliminate operator counting bias.
- **Variance Analysis**: Displays quantity and value discrepancies with automated reconciliation approval.

---

## 6. UNIVERSAL BARCODE & THERMAL LABEL STUDIO

Mounted globally via [`BarcodeStudioModal.tsx`](file:///e:/experimindlabs/inventory/src/shared/components/BarcodeStudioModal.tsx) and [`pdfLabelGenerator.ts`](file:///e:/experimindlabs/inventory/src/utils/pdfLabelGenerator.ts):

### High-Resolution Vector Rendering
- ISO/IEC Code-128 and QR Code vector generation via [`BarcodeSvg.tsx`](file:///e:/experimindlabs/inventory/src/shared/components/BarcodeSvg.tsx).
- Clean vector lines with high bar height (`90px`), bar width multiplier (`2.8`), and prominent storage location badges (`LOC: Rack - Shelf 1`).

### Supported PDF Sheet Formats
1. **A4 Sheet 24-up** (Avery 5160 / 3x8 Grid — 70mm x 37mm).
2. **A4 Compact Sheet 40-up** (4x10 Grid — 48mm x 25mm).
3. **Continuous Thermal Roll** (50mm x 25mm single stickers).
4. **Large Shipping Thermal Sticker** (70mm x 35mm).

---

## 7. UNIVERSAL BULK CSV CATALOG IMPORTER

Engineered in [`BulkImportModal.tsx`](file:///e:/experimindlabs/inventory/src/features/inventory/components/BulkImportModal.tsx) and API route [`src/routes/v1/bulk-import.ts`](file:///e:/experimindlabs/inventory/src/routes/v1/bulk-import.ts):

- **Drag-and-Drop File Upload**: Parses standard `.csv` spreadsheet files with automatic header mapping (`SKU`, `Item Name`, `Quantity`, `Unit Cost`, `Bin`).
- **Live Pre-Validation Grid**: Highlights missing fields, duplicate SKUs, and format errors before committing to database.
- **Atomic Transaction**: Uses TypeORM QueryRunner to insert products and create opening balance stock ledger journal entries in a single database transaction.
- **1-Click Template Download**: Exports standard template format directly from UI.

---

## 8. ROLE-BASED ACCESS CONTROL (RBAC) & ACTIVE SESSIONS

Engineered in [`RolePermissionMatrixTab.tsx`](file:///e:/experimindlabs/inventory/src/features/compliance/components/RolePermissionMatrixTab.tsx), [`UserDirectoryTab.tsx`](file:///e:/experimindlabs/inventory/src/features/compliance/components/UserDirectoryTab.tsx), [`ActiveSessionsModal.tsx`](file:///e:/experimindlabs/inventory/src/features/compliance/components/ActiveSessionsModal.tsx), and PostgreSQL tables `roles` & `sessions`.

### Built-in System Roles
1. **Super Administrator** (`super_admin`): Complete operational, financial, and organizational authority.
2. **Warehouse & Logistics Manager** (`warehouse_manager`): Layouts, STO transfers, dock receiving, picking & cycle counts.
3. **Procurement Specialist** (`procurement_specialist`): Vendor directories, PO issuance, and inbound shipments.
4. **Floor Operator / Barcode Scanner** (`floor_operator`): Counting, dock scanning, and pick-path fulfillment.
5. **Auditor / Read-Only Observer** (`auditor_readonly`): Read-only access to immutable stock ledger and compliance logs.

### Granular Capability Matrix (6 Modules)
- 📦 **Inventory**: `inventory:read`, `inventory:write`, `inventory:adjust`, `inventory:delete`
- 🏭 **Warehouse**: `warehouse:read`, `warehouse:write`, `warehouse:transfer`, `warehouse:audit`
- 📥 **Procurement**: `procurement:read`, `procurement:write`, `procurement:receive`
- 🚚 **Sales**: `sales:read`, `sales:write`, `sales:dispatch`
- 💰 **Finance**: `finance:gst`, `finance:valuation`, `finance:zoho`
- 🛡️ **Governance**: `compliance:audit_logs`, `compliance:roles`, `compliance:users`, `compliance:approvals`

### Active Login Sessions & Security Revocation
- Tracks connected workstation metadata, IP addresses, browsers, and timestamps.
- **1-Click Individual Session Revocation**.
- **Emergency "Terminate All Other Sessions"** feature to protect compromised accounts.

---

## 9. GST CALCULATION ENGINE & E-INVOICING (IRP)

Engineered in [`GSTEngineTab.tsx`](file:///e:/experimindlabs/inventory/src/features/gst/GSTEngineTab.tsx) and [`src/utils/gst.ts`](file:///e:/experimindlabs/inventory/src/utils/gst.ts):

- **Intra-State vs Inter-State Tax Rule**:
  - **Same State (e.g. 27 Maharashtra ➔ 27 Maharashtra)**: Calculates **50% CGST** + **50% SGST**.
  - **Different State (e.g. 27 Maharashtra ➔ 29 Karnataka)**: Calculates **100% IGST**.
- **HSN / SAC Code Breakdown**: Computes tax aggregates by HSN code.
- **E-Invoicing IRP Mock Generator**: Generates 64-character hash IRN (Invoice Reference Number) and QR payload for GST portal e-invoicing compliance.

---

## 10. ZOHO BOOKS 2-WAY SYNC ENGINE

Engineered in [`ZohoIntegrationTab.tsx`](file:///e:/experimindlabs/inventory/src/features/integrations/ZohoIntegrationTab.tsx):

- **Bidirectional Synchronization**:
  - **Chart of Accounts**: Maps inventory assets, COGS, and sales tax accounts.
  - **Item Master**: Syncs SKU names, descriptions, reorder thresholds, and prices.
  - **Invoices & Bills**: Automatically posts purchase receipts as Vendor Bills and dispatched Sales Orders as Invoices.
- **Sync Diagnostics**: Provides connection status, error logs, and manual force-sync buttons.

---

## 11. PREDICTIVE ANALYTICS & AI BI ENGINE

Engineered in [`PredictiveAnalyticsTab.tsx`](file:///e:/experimindlabs/inventory/src/features/analytics/PredictiveAnalyticsTab.tsx):

1. **ABC / XYZ Multi-Dimensional Matrix**:
   - **ABC (Revenue Impact)**: Class A (top 80% revenue), Class B (next 15%), Class C (bottom 5%).
   - **XYZ (Demand Variability)**: Class X (steady demand), Class Y (seasonal variation), Class Z (sporadic demand).
2. **Holt-Winters Triple Exponential Smoothing**: Forecasts 30-day stock depletion and recommends exact reorder dates.
3. **CompAI Logistics Voice Copilot** ([`CompAIVoiceAssistant.tsx`](file:///e:/experimindlabs/inventory/src/features/copilot/components/CompAIVoiceAssistant.tsx)): Speech-to-text queries for stock lookups and picking guidance.

---

## 12. COMPREHENSIVE DATABASE SCHEMA & MIGRATIONS

The database contains 36+ relational tables managed via TypeORM migrations in [`src/migration/`](file:///e:/experimindlabs/inventory/src/migration):

| Table Name | Primary Function |
| :--- | :--- |
| `organizations` | Multi-tenant company profiles, GSTIN, currency, settings. |
| `users` | Employee credentials, hashed passwords, roles, status. |
| `roles` | System and custom roles with JSONB permission capability arrays. |
| `sessions` | Active JWT refresh token hashes, device metadata, IP addresses, revocation status. |
| `inventory_items` | Master product catalog, SKU, category, UOM, stock, threshold, bin. |
| `stock_ledger` | Immutable append-only transaction journal, FIFO costs, running balances. |
| `warehouses` | Physical storage facilities, addresses, zone counts. |
| `bins` | Micro storage locations, aisle, rack, shelf, bin codes. |
| `floor_plan_layouts` | Visual 2D coordinate objects, rack dimensions, zones. |
| `physical_racks` | Rack dimensions, bay levels, shelf capacities. |
| `kits` & `kit_bom` | Multi-level Bill of Materials (BOM) formulas and parent/child mappings. |
| `vendors` | Supplier profiles, contact info, lead times, rating scorecards. |
| `purchase_orders` & `lines` | Inbound orders, 3-way match quantities, statuses. |
| `customers` | Client directory, GSTIN, billing/shipping addresses. |
| `sales_orders` & `lines` | Outbound orders, pick status, dispatch details, AWB numbers. |
| `warehouse_transfers` & `lines`| Inter-warehouse transfer orders (STO) and transit states. |
| `serial_numbers` | Unit-level tracking, serial lifecycle (`IN_STOCK`, `ALLOCATED`, `DEFECTIVE`). |
| `cycle_counts` & `lines` | Physical inventory audits, blind counts, variance reports. |
| `invoices` & `invoice_lines` | GST tax invoices, sequence numbers, CGST/SGST/IGST breakdown. |
| `audit_logs` | System-wide administrative action stream with property diffs. |
| `settings` | System-wide configuration key-value storage. |
| `migrations` | TypeORM schema migration history ledger. |

---

## 13. REST API SPECIFICATION

All endpoints are versioned under `/api/v1/*` with JWT authorization (`Bearer <token>`):

### Authentication & Sessions
- `POST /api/v1/auth/login`: Authenticates credentials and returns JWT token.
- `GET /api/v1/sessions/me`: Lists active login sessions for current user.
- `POST /api/v1/sessions/:id/revoke`: Revokes a specific remote session.
- `POST /api/v1/sessions/revoke-all-others`: Terminates all other active sessions.

### RBAC & User Governance
- `GET /api/v1/rbac/roles`: Retrieves all system and custom roles with permissions.
- `POST /api/v1/rbac/roles`: Creates a new custom organizational role.
- `PUT /api/v1/rbac/roles/:id`: Updates permissions or metadata for a custom role.
- `DELETE /api/v1/rbac/roles/:id`: Deletes a custom role.
- `GET /api/v1/rbac/users`: Lists organization users with assigned roles.
- `PUT /api/v1/rbac/users/:id/role`: Reassigns an employee's role.

### Inventory & Stock Ledger
- `GET /api/v1/inventory`: Lists all inventory items with stock levels.
- `POST /api/v1/inventory`: Creates a new inventory item.
- `PUT /api/v1/inventory/:id`: Updates an inventory item.
- `DELETE /api/v1/inventory/:id`: Deletes an inventory item.
- `GET /api/v1/ledger`: Retrieves paginated, filterable double-entry stock ledger journal.
- `POST /api/v1/ledger/adjust`: Posts a supervised manual stock adjustment.
- `POST /api/v1/bulk-import/items`: Atomically imports batch CSV spreadsheet data.

### Warehouse & WMS
- `GET /api/v1/warehouses`: Lists all warehouse facilities.
- `GET /api/v1/warehouses/floorplan`: Fetches the active 2D/3D floorplan layout.
- `POST /api/v1/warehouses/floorplan`: Saves updated floorplan layout coordinates.
- `GET /api/v1/transfers`: Lists inter-warehouse stock transfer orders.
- `POST /api/v1/transfers`: Creates a new transfer order.
- `POST /api/v1/transfers/:id/ship`: Marks transfer order as In-Transit.
- `POST /api/v1/transfers/:id/receive`: Receives transfer and slots items at destination.

---

## 14. PRODUCTION DEPLOYMENT & INFRASTRUCTURE

### Production Server Details
- **Public IP**: `13.233.142.180` (AWS EC2 Debian Linux aarch64 Graviton)
- **Application Directory**: `/home/admin/experimind-inventory`
- **Database**: PostgreSQL 17 on `127.0.0.1:5432` (`experimind_inventory` database)
- **PM2 Process Name**: `experimind-inventory`
- **Nginx Config Path**: `/etc/nginx/sites-available/experimind`

### Deployment Commands (Local ➔ AWS)
```bash
# 1. Build production bundles locally
npm run build

# 2. Package bundle
tar --exclude="node_modules" --exclude=".git" --exclude="*.pem" --exclude="deploy_bundle.tar.gz" -czf deploy_bundle.tar.gz dist src scripts server.ts package.json package-lock.json tsconfig.json vite.config.ts

# 3. Upload to AWS EC2
scp -i "inventory.pem" deploy_bundle.tar.gz admin@13.233.142.180:/home/admin/deploy_bundle.tar.gz

# 4. Extract and restart PM2 on AWS
ssh -i "inventory.pem" admin@13.233.142.180 "cd /home/admin/experimind-inventory && tar -xzf /home/admin/deploy_bundle.tar.gz && pm2 restart experimind-inventory && chmod -R 755 /home/admin/experimind-inventory/dist"
```

---

## 15. CUSTOM DOMAIN & HTTPS SETUP GUIDE

To connect your custom domains (`shop.experimindlabs.com` for customers and `inventory.experimindlabs.com` for internal warehouse/ERP operations):

### 1. Configure DNS Records (Registrar / Cloudflare / GoDaddy / AWS Route 53)
Add two **A Records** in your DNS management console targeting your AWS server elastic IP `13.233.142.180`:

| Type | Name / Host | Target IP / Value | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `shop` (or `shop.experimindlabs.com`) | `13.233.142.180` | Auto / 300 | Public Customer Storefront |
| **A** | `inventory` (or `inventory.experimindlabs.com`) | `13.233.142.180` | Auto / 300 | Enterprise WMS & ERP Portal |

---

### 2. Dual-Virtual Host Nginx Configuration on AWS
The production Nginx reverse proxy configuration at `/etc/nginx/sites-available/experimind` routes traffic seamlessly:

```nginx
# =========================================================================
# 1. Internal Enterprise Inventory ERP & WMS Portal
# =========================================================================
server {
    listen 80;
    listen [::]:80;
    server_name inventory.experimindlabs.com 13.233.142.180;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# =========================================================================
# 2. Public B2B & Educational Storefront Portal
# =========================================================================
server {
    listen 80;
    listen [::]:80;
    server_name shop.experimindlabs.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### 3. Automated Let's Encrypt SSL Certificates with Certbot (COMPLETED & ACTIVE)
Let's Encrypt certificates have been issued and deployed to Nginx on AWS:

- **Certificate Path**: `/etc/letsencrypt/live/inventory.experimindlabs.com/fullchain.pem`
- **Private Key**: `/etc/letsencrypt/live/inventory.experimindlabs.com/privkey.pem`
- **Active Domains with Trusted Green Padlock**:
  - `https://inventory.experimindlabs.com/` (Status: 200 OK)
  - `https://erp.experimindlabs.com/` (Status: 200 OK)
- **Automatic Renewal**: Handled via systemd timer (`certbot.timer`).

*Once the `shop` A record is active in Hostinger DNS, run:*
```bash
sudo certbot --nginx -d shop.experimindlabs.com --expand
```

---

## 16. LOCAL DEVELOPMENT & TESTING WORKFLOWS

### Prerequisites
- Node.js 20+ / Node.js 24
- PostgreSQL 15+ (local instance or Docker container)

### Local Commands
```bash
# Install dependencies
npm install

# Run TypeScript typecheck
npm run typecheck

# Run complete Vitest suite (22 unit tests)
npm test

# Launch local development server
npm run dev

# Build production bundle
npm run build
```

---

## 17. MOBILE BARCODE SCANNER HUB & CAMERA ARCHITECTURE

### WebRTC Security & Camera Stream Context
Modern web browsers (Safari, Chrome, Firefox, Edge) restrict continuous live camera streaming via `navigator.mediaDevices.getUserMedia` exclusively to **secure origins** (`https://`, `localhost`, `127.0.0.1`). 

### Dual-Layer Scanning Engine
To ensure reliable operation across all devices, environments, and network conditions, the Scanner Hub provides a dual-layer architecture:

1. **Continuous Video Streaming (HTTPS / Localhost)**:
   - Uses `getUserMedia` with multi-tier fallback constraints (`{ facingMode: { ideal: 'environment' } }` ➔ `{ facingMode: 'environment' }` ➔ `{ video: true }`).
   - Frame grabber draws video frames to an offscreen canvas at 150ms intervals.
   - ZXing-C++ WASM engine decodes 1D barcodes (Code 128, EAN, UPC) and 2D QR codes with sub-50ms latency.
   - Integrated mobile haptic vibration (`navigator.vibrate(60)`) and realistic industrial laser targeting reticle.

2. **Mobile Camera Shutter Fallback (`capture="environment"`)**:
   - When accessed over non-secure plain HTTP IP where WebRTC is blocked by browser policy, the viewfinder seamlessly provides a 1-tap **"📸 Snap & Scan Camera"** trigger.
   - Leverages native device camera hardware directly without requiring browser WebRTC permissions.
   - Instantly decodes snapped photos using the multi-pass WASM decoder.
   - Includes a 1-click **"Unlock HTTPS Stream"** button to switch to encrypted port 443 where Nginx SSL is active.

---

## 18. PWA SERVICE WORKER SSL ARCHITECTURE & TRUSTED ORIGINS

### The ServiceWorker Security Boundary
Modern browsers strictly disallow ServiceWorker registration (`sw.js`) over untrusted or self-signed HTTPS connections on raw IP addresses (e.g. `https://13.233.142.180/`), returning a `SecurityError: Failed to register a ServiceWorker`.

### Resilient Registration Strategy
1. **Error-Suppressed Manual Registration**:
   - `vite-plugin-pwa` is configured with `injectRegister: null` to prevent uncatchable automated script tags.
   - `src/main.tsx` explicitly registers `virtual:pwa-register` with an `onRegisterError` interceptor.
   - When loaded over a self-signed IP or testing origin, the ServiceWorker registration fails gracefully without throwing uncaught promise rejections or halting execution.

2. **Full PWA Offline Support on Custom Domains**:
   - Once DNS A records point `shop.experimindlabs.com` and `inventory.experimindlabs.com` to `13.233.142.180` and Certbot installs trusted Let's Encrypt certificates, the ServiceWorker automatically activates with 100% offline cache capabilities.

---

*This document is maintained strictly on your machine at `docs/ENTERPRISE_SYSTEM_DOCUMENTATION.md`.*
