# NEXAINVENTORY ERP — ENTERPRISE SYSTEM MANUAL
**Experimind Labs Supply Chain, WMS Floor, Financials & Governance Platform**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS_v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

**NexaInventory ERP** is an enterprise-grade, single-codebase supply chain orchestration, WMS digital twin, assembly kitting, double-entry stock ledger, and fulfillment platform developed for **Experimind Labs**.

---

## 🌟 Master Capability Matrix

### 1. 📦 Inventory, Kitting & Double-Entry Ledger
- **Append-Only Stock Ledger (`stock_ledger`)**: Running balance calculation, FIFO costing, and supervised manual adjustments with mandatory audit reason codes.
- **Multi-Level Assembly Kitting (BOM)**: Formula manager, bottleneck calculator, and 1-click Pack/Unpack engine.
- **Serial & Lot Tracking**: Unit-level tracking and expiry batch management (FEFO).
- **Universal CSV Catalog Importer**: Drag-and-drop CSV importer with live pre-validation diff grid and atomic opening balance ledger posting.

### 2. 🏭 Warehouse Operations (WMS) & Digital Twin
- **2D Blueprint Floor Plan Designer**: Interactive canvas editor for storage racks, inbound docks, kitting benches, and traffic aisles.
- **2D Storage Density Heatmap**: Color-coded bin capacity and congestion visualizer.
- **3D WebGL Digital Twin**: Hardware-accelerated multi-tier racking visualizer with orbit controls.
- **Touchscreen Floor Operator Console**: Mobile tablet layout with hardware USB laser barcode scanner listener (`useBarcodeGunListener`).
- **Multi-Stage Stock Transfer Orders (STO)**: Full 3-phase transfer workflow (`Draft` ➔ `In-Transit` ➔ `Received`).
- **Cycle Counting & Blind Auditing**: Blind counting manifests, discrepancy calculations, and manager reconciliation.

### 3. 🏷️ Barcode & Thermal Label Studio
- **High-Resolution Vector Barcodes**: ISO/IEC Code-128 and QR codes with prominent physical location badges (`LOC: Rack - Shelf 1`).
- **Multi-Format PDF Sheet Export**: Avery 5160 (A4 24-up), A4 40-up, and continuous thermal rolls (50x25mm / 70x35mm).
- **Universal Barcode Scanner Hub**: ZXing-C++ WebAssembly scanner supporting camera feeds, photo uploads, and hardware barcode guns.

### 4. 🛡️ Enterprise Governance & Security
- **Visual Role-Based Access Control (RBAC)**: 5 pre-configured system roles (`Super Administrator`, `Warehouse Manager`, `Procurement Specialist`, `Floor Operator`, `Auditor`) + Custom Role Builder.
- **Granular Capability Matrix**: Interactive toggles across 6 modules (*Inventory, WMS, Procurement, Sales, Financials, Governance*).
- **Enterprise User Directory**: Searchable member roster with 1-click role reassignment.
- **Active Login Sessions & Security**: Real-time connected device audit and emergency **"Terminate All Other Sessions"** revocation.

### 5. 💰 Financials, GST & Integrations
- **GST Calculation Engine**: Automated intra-state (50/50 CGST + SGST) vs inter-state (100% IGST) tax calculations with HSN breakdown.
- **E-Invoicing (IRP) Compliance**: 64-character IRN hash and QR payload generation.
- **Zoho Books 2-Way Synchronization**: Chart of accounts, items, invoices, and vendor bills.
- **Predictive Analytics & AI BI**: ABC/XYZ revenue classification, Holt-Winters stock forecasting, and AI Logistics Voice Copilot.

---

## 🚀 Local Development Guide

### Prerequisites
- Node.js 20+ or 24+
- PostgreSQL 15+ (local or Docker)

### Installation & Run Commands
```bash
# 1. Install dependencies
npm install

# 2. Verify TypeScript types
npm run typecheck

# 3. Run complete unit test suite (22 tests)
npm test

# 4. Start local development server
npm run dev

# 5. Build production bundle
npm run build
```

---

## 📚 Complete Documentation Library (Stored Locally on Laptop)

- 📖 **[Master Enterprise System Documentation](docs/ENTERPRISE_SYSTEM_DOCUMENTATION.md)** — *Full technical architecture, all 36+ database schemas, REST APIs, and deployment guides.*
- 🛠️ **[Detailed Technical Documentation](docs/DETAILED_TECHNICAL_DOCUMENTATION.md)** — *Component lifecycle, undo/redo architecture, and state models.*
- 🚀 **[Setup & Deployment Guide](docs/SETUP_AND_DEPLOYMENT.md)** — *AWS EC2, Nginx, PM2, and SSL Certbot setup.*
- 🔧 **[Troubleshooting Guide](docs/TROUBLESHOOTING.md)** — *Common diagnostic commands, database recovery, and service logs.*
