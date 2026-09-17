# NEXAINVENTORY ERP — ENTERPRISE SYSTEM MANUAL
**Experimind Labs Supply Chain, WMS Digital Twin, Regulated QMS, Hardware PCBA & Dual-Platform Governance Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Compliance](https://img.shields.io/badge/FDA_21_CFR_Part_11-Compliant-emerald?style=for-the-badge)](https://www.fda.gov/)
[![Tests](https://img.shields.io/badge/Vitest-77%20Passed-brightgreen?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)

**NexaInventory ERP** is an enterprise-grade, single-codebase supply chain orchestration, WMS digital twin, assembly kitting, double-entry stock ledger, hardware electronics BOM engine, and fulfillment platform developed for **Experimind Labs**.

---

## 🌐 Production Deployments & Domains

- 🏢 **Platform ERP & WMS Cockpit**: [https://inventory.experimindlabs.com/](https://inventory.experimindlabs.com/)
- 🛍️ **Public Customer Storefront**: [https://shop.experimindlabs.com/](https://shop.experimindlabs.com/)
- 📖 **Interactive Swagger / OpenAPI Docs**: [https://inventory.experimindlabs.com/api/docs](https://inventory.experimindlabs.com/api/docs)
- ⚡ **Direct Server IP (AWS EC2)**: `http://13.233.142.180`

---

## 🌟 Master Capability Matrix

### 1. 📱 Laptop + Mobile Dual-Platform UI/UX Excellence
- **Universal Responsiveness**: Fully optimized across 375px mobile, tablet, laptop, and 4K industrial displays.
- **PWA Ready**: Offline-capable service worker, web manifest, and mobile install prompt.
- **Mobile Bottom Navigation Bar (`MobileBottomNav`)**: Ergonomic thumb-friendly navigation with live badges and floating barcode scanner trigger.
- **Micro-Animations & Skeletons**: Pure CSS `@keyframes shimmer` skeleton components (`SkeletonCard`, `SkeletonTable`, `SkeletonChart`) for seamless loading states.
- **Contextual Empty States (`EmptyState`)**: Visual illustration presets with direct CTA action buttons for zero-state inventories, empty searches, and healthy replenishment.
- **Design Tokens & Typography**: Inter typography family, HSL color tokens, and 100% theme consistency in both light and dark modes (`@custom-variant dark`).

### 2. 💰 Core Valuation & Inventory Cost Accounting (FIFO & Moving Average)
- **FIFO Cost Layers**: Real-time lot-based cost tracking that exhausts oldest cost layers first for accurate Cost of Goods Sold (COGS).
- **Weighted Moving Average Cost (MAC)**: Continuous weighted unit cost recalculation upon purchase order receipts.
- **Simulation Preview**: `/api/v1/inventory/:id/cogs-preview` enables real-time profitability and margin simulation prior to dispatch.
- **Valuation Breakdown**: Layer-by-layer valuation audit exposed at `/api/v1/inventory/:id/valuation`.

### 3. 🎯 WMS Operations & FEFO Batch Allocation
- **FEFO Picking Allocation**: First-Expired, First-Out picking engine at `/api/v1/wms/allocate-lots` prioritizing nearest non-expired batches for pharma and regulated materials.
- **Automatic Disqualification**: Quarantined, depleted, or past-expiry lots are automatically excluded from picking manifests.
- **Immutable Stock Ledger (`StockLedger`)**: Double-entry ledger with PostgreSQL pessimistic row locking (`SELECT FOR UPDATE`) across all movements (`PO_RECEIPT`, `SO_SHIPMENT`, `TRANSFER_IN`, `TRANSFER_OUT`, `CYCLE_COUNT_VARIANCE`).
- **Physical Rack Visualizer & Floor Plan Designer**: Interactive digital twin canvas for warehouse rack and bin layouts.

### 4. 📈 Dynamic Demand Forecasting & Safety Stock
- **30-Day Consumption Velocity**: Rolling consumption rate analysis across sales orders and kit assemblies.
- **Statistical Safety Stock**: Formula-driven safety stock `Z * sqrt(LeadTime) * StdDev` targeting 95% service level.
- **Dynamic Reorder Points**: Automated reorder triggers replacing static human guesswork.
- **Automated Restock Recommendations**: `/api/v1/report/reorder-recommendations` classifies inventory into `OUT_OF_STOCK`, `CRITICAL`, `REORDER_RECOMMENDED`, and `HEALTHY`.

### 5. 🔬 Hardware & Electronics PCBA BOM Engine
- **Multi-Level Recursive BOM**: Indented tree hierarchy with parent-child relationships, reference designators, and approved manufacturer part numbers (MPN).
- **ECAD Ingestion Pipeline**: Built-in parser for KiCad and Altium CSV/TSV BOM exports with automated field mapping.
- **SMT Reel Fractionation**: Split master component reels into cut-tapes with full pedigree inheritance.
- **Moisture Sensitivity Level (MSL) Tracking**: JEDEC J-STD-033 floor life countdown timers and dry-bake temperature logging.

### 6. 🛍️ Modern E-Commerce Storefront (Next.js 16)
- **Next.js 16 App Router**: Ultra-fast storefront with server-side rendering and static optimization.
- **Customer Experience**: Real-time product search, category filters, quick view modals, interactive cart, guest checkout, and order tracking.
- **B2B / Multi-Tenant Scoping**: Isolated customer orders and inventory allocations.

### 7. 🛡️ FDA 21 CFR Part 11 Compliance & Cryptographic Audit Trail
- **SHA-256 Hash-Chained Audit Trail (`audit_events`)**: Append-only tamper-evident audit ledger where every event cryptographically hashes the previous event in the chain.
- **Mathematical Chain Integrity Verifier**: Real-time console that walks the entire Merkle chain sequentially, detecting any altered records, deletions, or hash mismatches.
- **21 CFR Part 11 Electronic Signatures**: Password and TOTP re-authentication with cryptographic SHA-256 digest manifests bound to target record states and signature meanings (`APPROVED`, `REVIEWED`, `QUALITY_RELEASED`, `CAPA_CLOSED`).

### 8. 🏷️ GS1-128 Barcodes, Zebra ZPL-II & Real-Time Sync
- **GS1-128 Composite Encoding/Parsing**: Application Identifiers `(01)` GTIN, `(10)` Lot, `(17)` Expiry, `(21)` Serial, `(00)` SSCC.
- **Industrial Zebra ZPL-II Printing**: Direct thermal and thermal transfer 203 DPI label generation for SKUs, bins, and pallet containers.
- **Real-Time Server-Sent Events (SSE)**: Live `/api/v1/stream/events` channel broadcasting instant stock and PO updates without polling.

---

## 🚀 Local Development Guide

### Prerequisites
- Node.js 20+ or 24+
- PostgreSQL 15+ (local or Docker)

### Installation & Run Commands
```bash
# 1. Install root and storefront dependencies
npm install
npm --prefix apps/storefront install

# 2. Verify TypeScript types (Zero errors across entire project)
npm run typecheck

# 3. Run complete automated test suite (77 tests across 16 suites)
npm test

# 4. Start local development server (SPA + API backend)
npm run dev

# 5. Build production bundle (Vite PWA + esbuild server)
npm run build

# 6. Build Next.js Storefront
npm --prefix apps/storefront run build
```

---

## 📚 Complete Documentation Library

- 📖 **[Interactive Swagger / OpenAPI Documentation](https://inventory.experimindlabs.com/api/docs)** — *Interactive API console.*
- 🧭 **[Product Strategy & Comprehensive Roadmap](docs/PRODUCT_STRATEGY_AND_ROADMAP.md)** — *6–12 month strategic roadmap & phased milestones.*
- 📖 **[Master Enterprise System Documentation](docs/ENTERPRISE_SYSTEM_DOCUMENTATION.md)** — *Full technical architecture, all 40+ database schemas, REST APIs, and deployment guides.*
- 🛠️ **[Detailed Technical Documentation](docs/DETAILED_TECHNICAL_DOCUMENTATION.md)** — *Component lifecycle, undo/redo architecture, and state models.*
- 🚀 **[Setup & Deployment Guide](docs/SETUP_AND_DEPLOYMENT.md)** — *AWS EC2, Nginx, PM2, and SSL Certbot setup.*
- 🔧 **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** — *Common diagnostic commands, database recovery, and service logs.*
