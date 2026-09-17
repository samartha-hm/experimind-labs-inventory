# NEXAINVENTORY ERP — SETUP & DEPLOYMENT GUIDE
**Production AWS EC2 Architecture, Automated CI/CD Pipeline, Local Development & Nginx Runbook**

---

## 📑 TABLE OF CONTENTS
1. [Architecture & Topology Overview](#1-architecture--topology-overview)
2. [Production Environment Specifications](#2-production-environment-specifications)
3. [Automated AWS Deployment Pipeline (`deploy-aws.ps1`)](#3-automated-aws-deployment-pipeline-deploy-awsps1)
4. [Manual Remote Deployment Runbook (SSH)](#4-manual-remote-deployment-runbook-ssh)
5. [Process Supervisor & PM2 Management](#5-process-supervisor--pm2-management)
6. [Nginx Reverse Proxy & SSL Configuration](#6-nginx-reverse-proxy--ssl-configuration)
7. [PostgreSQL Database Management & Migrations](#7-postgresql-database-management--migrations)
8. [Local Development Setup](#8-local-development-setup)
9. [Healthchecks & Live Monitoring Endpoints](#9-healthchecks--live-monitoring-endpoints)

---

## 1. ARCHITECTURE & TOPOLOGY OVERVIEW

NexaInventory ERP runs in production on a single high-efficiency **AWS EC2** instance running Debian Linux with a multi-process architecture orchestrated by **PM2** and **Nginx**:

```
                                [ PUBLIC TRAFFIC / WEB CLIENTS ]
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
        https://inventory.experimindlabs.com                   https://shop.experimindlabs.com
        https://erp.experimindlabs.com                         (Public Next.js 16 Storefront)
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                │ Port 80/443
                                                ▼
                             [ NGINX REVERSE PROXY (v1.26) ]
                             - Let's Encrypt SSL / TLS v1.3
                             - HTTP/2 & Gzip/Brotli Compression
                             - Request Rate Limiting & WebSocket Upgrade
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     │ Proxy: http://127.0.0.1:3000                        │ Proxy: http://127.0.0.1:3001
                     ▼                                                     ▼
       [ PM2: experimind-inventory ]                         [ PM2: experimind-storefront ]
       - Port 3000                                           - Port 3001
       - Single-bundle: dist/server.cjs                      - Next.js 16 App Router SSR/SSG
       - Serves Vite PWA static assets                       - Storefront Catalog & Cart
       - Express REST API & Realtime SSE                     - Max Memory Restart: 200MB
       - Max Memory Restart: 400MB                                         │
                     │                                                     │
                     └──────────────────────────┬──────────────────────────┘
                                                │ Internal API & Data Queries
                                                ▼
                             [ POSTGRESQL 15+ (PORT 5432) ]
                             - Database: experimind_inventory
                             - User: experimind
                             - Immutable Stock Ledger (SELECT FOR UPDATE)
                             - 40+ Normalized Tables & B-Tree Indexes
```

---

## 2. PRODUCTION ENVIRONMENT SPECIFICATIONS

- **Server IP**: `13.233.142.180` (AWS EC2, ap-south-1 Mumbai)
- **SSH User**: `admin`
- **SSH Authentication Key**: `inventory.pem` (RSA Private Key)
- **Application Directory**: `/home/admin/experimind-inventory`
- **Node.js Runtime**: `v20.20.2 LTS` (npm `v10.8.2`)
- **PostgreSQL Database**: `experimind_inventory` (Port `5432`)
- **Process Supervisor**: PM2 `v7.0.4`
- **Swap Memory**: 2 GB Linux Swapfile (`/swapfile`) ensuring zero out-of-memory (OOM) failures during builds and high-concurrency spikes.

---

## 3. AUTOMATED AWS DEPLOYMENT PIPELINE (`deploy-aws.ps1`)

The repository includes a fully automated 1-click deployment script: [`scripts/deploy-aws.ps1`](file:///e:/experimindlabs/inventory/scripts/deploy-aws.ps1).

### Prerequisites
1. Ensure `inventory.pem` is present in the project root directory.
2. Ensure SSH and PowerShell are installed on your workstation.

### Execution Command
From the project root directory in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-aws.ps1
```

### Optional Custom Parameters
```powershell
powershell -ExecutionPolicy Bypass -File scripts/deploy-aws.ps1 -ServerIP "13.233.142.180" -User "admin" -KeyFile "inventory.pem"
```

### What the Automated Pipeline Executes:

```
[1/5] Local Compilation
      ├── npm run build (Vite PWA SPA -> dist/ + esbuild server.ts -> dist/server.cjs)
      └── npm --prefix apps/storefront run build (Next.js 16 Storefront static generation)

[2/5] Deployment Package Archive
      └── tar -czf deploy_bundle.tar.gz dist apps public package.json package-lock.json ecosystem.config.cjs scripts src tsconfig.json
          (Excludes local node_modules and scratch files; size ~1.5 MB)

[3/5] Secure Upload
      ├── scp deploy_bundle.tar.gz admin@13.233.142.180:/home/admin/
      └── scp scripts/setup-aws.sh admin@13.233.142.180:/home/admin/

[4/5] Remote Provisioning & PM2 Reload
      ├── chmod +x /home/admin/setup-aws.sh && /home/admin/setup-aws.sh (Idempotent prerequisite check)
      ├── tar -xzf /home/admin/deploy_bundle.tar.gz -C /home/admin/experimind-inventory
      ├── npm install --omit=dev --no-audit (Fast production dependency sync)
      ├── cd apps/storefront && npm install --no-audit && npm run build (Native SSR bundle)
      ├── npm run db:migrate (TypeORM migrations on PostgreSQL)
      ├── npm run bootstrap:admin (Admin user account verification)
      ├── npm run db:seed:real (329 real inventory items & STEM kits verification)
      └── pm2 start ecosystem.config.cjs && pm2 save (Zero-downtime process restart)

[5/5] Completion & Verification
      └── Automated verification of PM2 process table and HTTP 200 /health checks.
```

---

## 4. MANUAL REMOTE DEPLOYMENT RUNBOOK (SSH)

If you need to connect to the AWS instance manually to perform maintenance, view live server metrics, or debug runtime issues:

### 4.1 Connect via SSH
```bash
ssh -i inventory.pem admin@13.233.142.180
```

### 4.2 Navigate to Application Directory
```bash
cd /home/admin/experimind-inventory
```

### 4.3 Manual Pull & Restart Sequence
```bash
# Unpack updated bundle (if transferred manually)
tar -xzf /home/admin/deploy_bundle.tar.gz -C /home/admin/experimind-inventory

# Install production dependencies
npm install --omit=dev --no-audit

# Build storefront
cd apps/storefront
npm install --no-audit
npm run build
cd /home/admin/experimind-inventory

# Run migrations
npm run db:migrate

# Restart PM2
pm2 reload all
pm2 save
```

---

## 5. PROCESS SUPERVISOR & PM2 MANAGEMENT

Applications are managed by PM2 using [`ecosystem.config.cjs`](file:///e:/experimindlabs/inventory/ecosystem.config.cjs):

```javascript
module.exports = {
  apps: [
    {
      name: 'experimind-inventory',
      script: './dist/server.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgres://experimind:ExperimindPass2026!@127.0.0.1:5432/experimind_inventory',
        JWT_SECRET: 'experimind_jwt_super_secret_production_key_2026_x89',
        APP_URL: 'https://inventory.experimindlabs.com'
      }
    },
    {
      name: 'experimind-storefront',
      script: 'npm',
      args: 'start',
      cwd: './apps/storefront',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        API_URL: 'http://127.0.0.1:3000/api'
      }
    }
  ]
};
```

### Useful PM2 Commands:
```bash
# View process status and memory usage
pm2 status

# View real-time aggregated logs
pm2 logs

# View specific process logs
pm2 logs experimind-inventory --lines 100
pm2 logs experimind-storefront --lines 100

# Zero-downtime graceful reload
pm2 reload all

# Full restart
pm2 restart all

# Save current process list for system reboot auto-start
pm2 save
```

---

## 6. NGINX REVERSE PROXY & SSL CONFIGURATION

The Nginx configuration file is located at `/etc/nginx/sites-available/experimind` (and symlinked to `/etc/nginx/sites-enabled/experimind`). A replica is maintained in [`scripts/nginx-experimind.conf`](file:///e:/experimindlabs/inventory/scripts/nginx-experimind.conf).

### 6.1 Virtual Hosts & Routing Rules
- **`inventory.experimindlabs.com` & `erp.experimindlabs.com`**:
  - Proxies to `http://127.0.0.1:3000` (Main ERP API & Vite SPA).
  - Includes WebSocket headers (`Upgrade`, `Connection: upgrade`) for Server-Sent Events and real-time streams.
- **`shop.experimindlabs.com`**:
  - Proxies to `http://127.0.0.1:3001` (Next.js 16 Storefront).
  - Includes Next.js asset caching rules (`/_next/static/` max-age 31536000s immutable).
- **Direct IP (`13.233.142.180`)**:
  - Routes directly to ERP Port 3000 with HTTP 200 healthcheck support.

### 6.2 Nginx Management Commands
```bash
# Test configuration syntax
sudo nginx -t

# Reload configuration without dropping connections
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx
```

### 6.3 SSL Certificate Management (Let's Encrypt / Certbot)
Certificates are managed by Certbot with automated renewal timers:

```bash
# Renew certificates manually
sudo certbot renew

# Test renewal dry-run
sudo certbot renew --dry-run

# Re-issue or add new domains
sudo certbot --nginx -d inventory.experimindlabs.com -d erp.experimindlabs.com -d shop.experimindlabs.com
```

---

## 7. POSTGRESQL DATABASE MANAGEMENT & MIGRATIONS

### 7.1 Database Credentials (Production)
- **Host**: `127.0.0.1` (Local loopback only, external access blocked by AWS Security Group)
- **Port**: `5432`
- **Database**: `experimind_inventory`
- **Username**: `experimind`
- **Password**: `ExperimindPass2026!`

### 7.2 Database Access & Diagnostics
```bash
# Access PostgreSQL interactive shell
sudo -u postgres psql -d experimind_inventory

# List tables and row counts
\dt
SELECT count(*) FROM inventory_items;
SELECT count(*) FROM stock_ledger;
SELECT count(*) FROM stock_lots;

# Exit psql
\q
```

### 7.3 Running Database Migrations
Migrations are stored in [`src/migration/`](file:///e:/experimindlabs/inventory/src/migration) and executed by `scripts/run-migrations.ts`:

```bash
# From /home/admin/experimind-inventory:
npm run db:migrate
```

### 7.4 Backup & Restore Runbook
```bash
# Create timestamped database backup
sudo -u postgres pg_dump -Fc experimind_inventory > /home/admin/backup_$(date +%Y%m%d_%H%M%S).dump

# Restore from backup dump
sudo -u postgres pg_restore -d experimind_inventory -c /home/admin/backup_file.dump
```

---

## 8. LOCAL DEVELOPMENT SETUP

To run the application locally on your developer machine:

### 8.1 Prerequisites
- Node.js 20+
- PostgreSQL 15+ running locally (or via Docker)

### 8.2 Environment Configuration (`.env`)
Create `.env` in the root directory:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://postgres:postgres@localhost:5432/experimind_inventory
JWT_SECRET=super_secret_local_dev_jwt_key_2026
ALLOW_GUEST=true
GUEST_ROLE=admin
```

### 8.3 Install & Start
```bash
# 1. Install dependencies
npm install
npm --prefix apps/storefront install

# 2. Verify types
npm run typecheck

# 3. Run automated tests (77 tests across 16 test suites)
npm test

# 4. Start local development server (Hot-reloading API + React SPA)
npm run dev

# 5. (Optional) Start Storefront development server
npm --prefix apps/storefront run dev
```

---

## 9. HEALTHCHECKS & LIVE MONITORING ENDPOINTS

The production deployment provides automated healthchecks and observability endpoints:

| Endpoint | Method | Expected Output | Description |
|---|---|---|---|
| `/health` | `GET` | `{"status":"healthy","uptimeSeconds":...}` | Lightweight process uptime probe for load balancers |
| `/ready` | `GET` | `{"status":"ready","db":"connected"}` | Deep probe testing PostgreSQL connection pool |
| `/metrics` | `GET` | `{"uptime":...,"memory":{"rssMb":...}}` | Real-time heap and memory telemetry |
| `/api/docs` | `GET` | HTML (Swagger UI) | Interactive OpenAPI 3.0 API Console |
| `/api/docs/openapi.json` | `GET` | JSON (OpenAPI Spec) | Machine-readable API schema |

### Quick Health Verification via CLI:
```bash
# Test local endpoint on server:
curl -s http://127.0.0.1:3000/health

# Test public domain:
curl -s https://inventory.experimindlabs.com/health

# Test public storefront:
curl -s -I https://shop.experimindlabs.com/ | head -n 5
```
