# NEXAINVENTORY ERP — ENTERPRISE SYSTEM MANUAL
**Experimind Labs Supply Chain, WMS Digital Twin, Regulated QMS & Governance Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Compliance](https://img.shields.io/badge/FDA_21_CFR_Part_11-Compliant-emerald?style=for-the-badge)](https://www.fda.gov/)

**NexaInventory ERP** is an enterprise-grade, single-codebase supply chain orchestration, WMS digital twin, assembly kitting, double-entry stock ledger, and fulfillment platform developed for **Experimind Labs**.

---

## 🌐 Production Deployments & Domains

- 🏢 **Platform ERP & WMS Cockpit**: [https://inventory.experimindlabs.com/](https://inventory.experimindlabs.com/)
- 🛍️ **Public Customer Storefront**: [https://shop.experimindlabs.com/](https://shop.experimindlabs.com/)
- ⚡ **Direct Server IP (AWS EC2)**: `http://13.233.142.180`

---

## 🌟 Master Capability Matrix

### 1. 📦 Inventory, Multi-Location WMS & Double-Entry Ledger
- **Multi-Location Topology (`stock_locations`)**: Per-warehouse, per-zone, and per-bin on-hand, allocated, reserved, and quarantined inventory.
- **Lot Master & Expiry (FEFO)**: [`stock_lots`](src/entity/StockLot.ts) with manufacture/expiry dates, First-Expired First-Out picking, and Certificate of Analysis (CoA) document links.
- **Dual Units of Measure (UoM)**: [`uom_conversions`](src/entity/UomConversion.ts) supporting automated bulk-to-each conversions.
- **Append-Only Stock Ledger (`stock_ledger`)**: Running balance calculation, FIFO costing, and supervised manual adjustments with mandatory audit reason codes.
- **Multi-Level Assembly Kitting (BOM)**: Formula manager, bottleneck calculator, and 1-click Pack/Unpack engine.
- **Universal CSV Catalog Importer**: Drag-and-drop CSV importer with live pre-validation diff grid and atomic opening balance ledger posting.

### 2. 🛡️ FDA 21 CFR Part 11 Compliance & Cryptographic Audit Trail
- **SHA-256 Hash-Chained Audit Trail (`audit_events`)**: Append-only tamper-evident audit ledger where every event cryptographically hashes the previous event in the chain.
- **Mathematical Chain Integrity Verifier**: Real-time console that walks the entire Merkle chain sequentially, detecting any altered records, deletions, or hash mismatches.
- **21 CFR Part 11 Electronic Signatures**: Password and TOTP re-authentication with cryptographic SHA-256 digest manifests bound to target record states and signature meanings (`APPROVED`, `REVIEWED`, `QUALITY_RELEASED`, `CAPA_CLOSED`).

### 3. 🔬 Quality Management System (QMS) & Regulated Suite
- **Inbound Inspections**: Sampling checklists, defect counting, and automated NCR triggering on inspection failure.
- **Deviations (NCR)**: Non-conformance reporting, severity triage, root-cause investigation, and disposition approvals.
- **Corrective and Preventive Actions (CAPA)**: 5-Whys root-cause methodology, multi-owner action item tracking, and effectiveness verification.
- **Engineering Change Orders (ECO)**: BOM revision change control, impact analysis, and Change Control Board (CCB) electronic sign-offs.
- **Reverse Logistics (RMA)**: Item returns grading, quarantine inspections, and automated stock ledger restock.

### 4. 🏷️ GS1-128 Barcodes, Zebra ZPL-II & Real-Time Sync
- **GS1-128 Composite Encoding/Parsing**: Application Identifiers `(01)` GTIN, `(10)` Lot, `(17)` Expiry, `(21)` Serial, `(00)` SSCC.
- **Industrial Zebra ZPL-II Printing**: Direct thermal and thermal transfer 203 DPI label generation for SKUs, bins, and pallet containers.
- **Real-Time Server-Sent Events (SSE)**: Live `/api/v1/stream/events` channel broadcasting instant stock and PO updates without full table re-fetching.

### 5. 🔐 Enterprise Security & MFA
- **RFC 6238 TOTP Multi-Factor Authentication**: Built-in Base32 decoding, HMAC-SHA1 dynamic truncation, ±1 drift window verification, and backup recovery codes.
- **Strict Role-Based Access Control (RBAC)**: Fine-grained database-backed permission validation, eliminating universal admin bypasses.
- **SSRF & Network Hardening**: Private IP, loopback, and cloud metadata blocking on all proxy routes.
- **Active Session Audit & Revocation**: Real-time connected device tracking and 1-click session invalidation.

---

## 🚀 Local Development Guide

### Prerequisites
- Node.js 20+ or 24+
- PostgreSQL 15+ (local or Docker)

### Installation & Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Verify TypeScript types (Zero errors)
npm run typecheck

# 3. Run complete automated test suite (34 tests across 8 suites)
npm test

# 4. Start local development server
npm run dev

# 5. Build production bundle (Vite PWA + Node backend)
npm run build
```

---

## 📚 Complete Documentation Library

- 📖 **[Master Enterprise System Documentation](docs/ENTERPRISE_SYSTEM_DOCUMENTATION.md)** — *Full technical architecture, all 40+ database schemas, REST APIs, and deployment guides.*
- 🛠️ **[Detailed Technical Documentation](docs/DETAILED_TECHNICAL_DOCUMENTATION.md)** — *Component lifecycle, undo/redo architecture, and state models.*
- 🚀 **[Setup & Deployment Guide](docs/SETUP_AND_DEPLOYMENT.md)** — *AWS EC2, Nginx, PM2, and SSL Certbot setup.*
- 🔧 **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** — *Common diagnostic commands, database recovery, and service logs.*
