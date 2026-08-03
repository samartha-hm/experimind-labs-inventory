# ENTERPRISE INVENTORY MANAGEMENT SYSTEM (NexaInventory ERP)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**NexaInventory ERP** is an enterprise-grade supply chain, inventory, assembly kitting, and fulfillment management platform built with React 18, Vite, Express, TypeORM, and PostgreSQL.

---

## 🌟 Key Capabilities & Architectural Highlights

- **Zero Firebase Dependency**: Fully self-contained local REST API architecture with local JWT authentication and bcrypt password hashing.
- **CompAI Agentic Workflow & Human-in-the-Loop Safeguards**: Floating AI suggestion bar, background database row leases, research task log drawer, and explicit confirmation safeguards (`Confirm` / `Dismiss`).
- **Global Command Palette (`Ctrl+K`)**: Spotlight fuzzy search modal for instant lookup across SKUs, Kits, Sales Orders, Purchase Orders, and Vendors.
- **Statistical Safety Stock & Reorder Point (ROP) Calculator**: Real-time formula-driven ROP calculator:
  $$\text{ROP} = (\text{Lead Time} \times \text{Daily Usage}) + \text{Safety Stock}$$
- **Supplier Performance & Quality Radar**: Vendor scorecards tracking On-Time Delivery %, Average Lead Times, and Defect Rates.
- **Financial Inventory Valuation & COGS Hub**: Toggle dynamically between **FIFO Layering** and **Moving Average Costing** with multi-currency toggles (**₹ INR** ↔ **$ USD**).
- **Visual Supply Chain Flow Pipeline**: Interactive SVG node flowchart mapping logistics from suppliers to delivery.
- **ThermaPrint™ Barcode & QR Label Studio**: Optical barcode/QR scanner simulator and 50mm x 25mm thermal print label generator.
- **Automations & Webhooks Engine**: Trigger rule manager with live Webhook POST test simulator.
- **GitHub-Style System Revision History**: Property diff viewer (`- old value` / `+ new value`) with author attribution (`Guest Administrator` | `ADMIN`).
- **System-Wide Undo / Redo Framework**: Action stack supporting `Ctrl+Z` / `Ctrl+Y` with explicit floating widget labels (e.g. `Undo: Update Wash bottles`).

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- PostgreSQL Database

### Installation & Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the project root:
   ```env
   PORT=3000
   DATABASE_URL=postgres://postgres:postgres@localhost:5432/inventory_db
   JWT_SECRET=your_jwt_secret_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. **Database Migration & Seeding**:
   ```bash
   npx ts-node scripts/migrate_local.cjs
   ```

4. **Launch Development Server**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your web browser.

---

## 📚 Technical Documentation

For detailed architecture diagrams, database schemas, REST API endpoints, and RBAC rules, see:
- [Detailed Technical Documentation](docs/DETAILED_TECHNICAL_DOCUMENTATION.md)
- [Setup & Deployment Guide](docs/SETUP_AND_DEPLOYMENT.md)
- [Troubleshooting Guide](docs/TROUBLESHOOTING.md)
