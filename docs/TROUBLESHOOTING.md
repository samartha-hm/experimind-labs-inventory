# NEXAINVENTORY ERP — TROUBLESHOOTING & DIAGNOSTICS MANUAL
**Production AWS EC2 Diagnostics, PM2 Recovery, Nginx 502 Resolution, PostgreSQL Runbook & Error Reference**

---

## 📑 TABLE OF CONTENTS
1. [Rapid Emergency Diagnostic Checklist](#1-rapid-emergency-diagnostic-checklist)
2. [Process Management & PM2 Issues](#2-process-management--pm2-issues)
3. [Nginx 502 Bad Gateway & SSL Errors](#3-nginx-502-bad-gateway--ssl-errors)
4. [PostgreSQL Database & Migration Issues](#4-postgresql-database--migration-issues)
5. [Memory, Swap & OOM Resolution](#5-memory-swap--oom-resolution)
6. [Storefront (Next.js 16) Diagnostics](#6-storefront-nextjs-16-diagnostics)
7. [Client-Side & PWA Offline Sync Issues](#7-client-side--pwa-offline-sync-issues)

---

## 1. RAPID EMERGENCY DIAGNOSTIC CHECKLIST

When an outage or anomaly occurs in production, run this 60-second triage via SSH on AWS EC2 (`admin@13.233.142.180`):

```bash
# 1. Check PM2 process table
pm2 status

# 2. Check system memory and swap usage
free -m

# 3. Check disk space
df -h /

# 4. Check PostgreSQL service status
sudo systemctl status postgresql --no-pager

# 5. Check Nginx reverse proxy status
sudo systemctl status nginx --no-pager

# 6. Test local backend health response
curl -s http://127.0.0.1:3000/health

# 7. Test local storefront response
curl -s -I http://127.0.0.1:3001/ | head -n 3
```

---

## 2. PROCESS MANAGEMENT & PM2 ISSUES

### Symptom A: Process Status shows `errored` or `stopped`
- **Cause**: Unhandled runtime exception on startup, missing environment variables, or database connection timeout.
- **Resolution**:
  ```bash
  # Check the last 50 error log lines
  pm2 logs experimind-inventory --err --lines 50

  # Inspect specific process details
  pm2 describe experimind-inventory

  # Restart the application
  pm2 restart experimind-inventory
  ```

### Symptom B: Constant Restart Loop (High restart count `↺`)
- **Cause**: Memory limit exceeded (`max_memory_restart: '400M'`) or missing native binary.
- **Resolution**:
  ```bash
  # Check if swap is active
  swapon --show

  # If memory leak, inspect heap metrics via API:
  curl -s http://127.0.0.1:3000/metrics | jq .memory

  # Perform a clean process restart
  pm2 delete all
  cd /home/admin/experimind-inventory
  pm2 start ecosystem.config.cjs
  pm2 save
  ```

---

## 3. NGINX 502 BAD GATEWAY & SSL ERRORS

### Symptom A: Browser displays `502 Bad Gateway`
- **Cause**: Nginx is running, but the upstream application process (Port 3000 for ERP or Port 3001 for Storefront) is not listening.
- **Resolution**:
  1. Verify which ports are currently bound:
     ```bash
     sudo ss -tulpn | grep -E '3000|3001|80|443'
     ```
  2. If Port 3000 is missing, restart the ERP backend:
     ```bash
     pm2 restart experimind-inventory
     ```
  3. If Port 3001 is missing, restart the Storefront:
     ```bash
     pm2 restart experimind-storefront
     ```
  4. Inspect Nginx error logs:
     ```bash
     sudo tail -n 50 /var/log/nginx/error.log
     ```

### Symptom B: SSL Certificate Expiration or Warning
- **Cause**: Let's Encrypt certificate renewal failed due to rate limits or DNS changes.
- **Resolution**:
  ```bash
  # Test certificate renewal in dry-run mode
  sudo certbot renew --dry-run

  # Force immediate renewal
  sudo certbot renew --force-renewal

  # Reload Nginx after renewal
  sudo nginx -t && sudo systemctl reload nginx
  ```

---

## 4. POSTGRESQL DATABASE & MIGRATION ISSUES

### Symptom A: `Connection refused at 127.0.0.1:5432`
- **Cause**: PostgreSQL service is inactive or crashed due to disk space exhaustion.
- **Resolution**:
  ```bash
  # Check PostgreSQL service status
  sudo systemctl status postgresql

  # Start service if stopped
  sudo systemctl start postgresql

  # Check disk space (PostgreSQL halts if disk is 100% full)
  df -h /
  ```

### Symptom B: `password authentication failed for user "experimind"`
- **Cause**: Password mismatch between `ecosystem.config.cjs` and PostgreSQL role.
- **Resolution**:
  ```bash
  sudo -u postgres psql -c "ALTER ROLE experimind WITH PASSWORD 'ExperimindPass2026!';"
  pm2 restart experimind-inventory
  ```

### Symptom C: Migration Failure (`QueryFailedError`)
- **Cause**: A column or index already exists from a prior manual patch.
- **Resolution**:
  ```bash
  # Check migrations table in database:
  sudo -u postgres psql -d experimind_inventory -c "SELECT * FROM migrations;"

  # Run migration runner directly:
  cd /home/admin/experimind-inventory
  npx tsx scripts/run-migrations.ts
  ```

---

## 5. MEMORY, SWAP & OOM RESOLUTION

On micro/small AWS EC2 instances (512MB RAM), building or running multiple Node.js processes can trigger the Linux Out-Of-Memory (OOM) killer.

### Verifying Swap Status:
```bash
swapon --show
free -m
```

### Re-creating 2GB Swapfile (if missing):
```bash
sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 6. STOREFRONT (NEXT.JS 16) DIAGNOSTICS

### Symptom A: Next.js Storefront Fails to Build on EC2
- **Cause**: High memory consumption during Turbopack compilation.
- **Resolution**:
  Build the storefront locally on your workstation, then copy the output, or ensure swap is active:
  ```bash
  cd /home/admin/experimind-inventory/apps/storefront
  NODE_OPTIONS="--max-old-space-size=1024" npm run build
  pm2 restart experimind-storefront
  ```

### Symptom B: Storefront Products Not Loading
- **Cause**: Storefront cannot communicate with internal ERP API.
- **Resolution**:
  Verify `API_URL` environment variable in `ecosystem.config.cjs` is pointing to `http://127.0.0.1:3000/api`.
  Test internal connection from server:
  ```bash
  curl -s http://127.0.0.1:3000/api/public/storefront/catalog | jq .
  ```

---

## 7. CLIENT-SIDE & PWA OFFLINE SYNC ISSUES

### Symptom A: Old UI Version Displayed After Deployment
- **Cause**: Browser PWA Service Worker caching old chunk hashes.
- **Resolution**:
  1. Open Developer Tools (F12) -> **Application** -> **Service Workers**.
  2. Click **Unregister** and check **Update on reload**.
  3. Perform a Hard Refresh: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac).

### Symptom B: Camera Barcode Scanner Fails to Launch
- **Cause**: Browser requires HTTPS context (`navigator.mediaDevices.getUserMedia` is blocked over plain HTTP).
- **Resolution**:
  Access the platform through secure domain: [`https://inventory.experimindlabs.com/`](https://inventory.experimindlabs.com/). Plain IP access (`http://13.233.142.180`) blocks camera hardware on mobile devices.
