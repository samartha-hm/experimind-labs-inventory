# Operations Runbook — Experimind Labs Inventory (AWS production)

Production: `http://13.233.142.180` — main app on `:3000`, Next.js storefront on `:3001`,
PostgreSQL 17 on `localhost:5432` (database `experimind_inventory`). App directory:
`/home/admin/experimind-inventory`. SSH: `admin@13.233.142.180` with `inventory.pem`.

This runbook covers the three operational safeguards required by the readiness plan
(`docs/PLATFORM_REPLAN_AND_READINESS_PLAN.md`, item 5): **backup rotation**,
**disk monitoring**, and **rollback**.

## 1. Database backup rotation

- **Script:** `scripts/ops/backup-rotate.sh` (runs on the server)
- **Schedule:** systemd timer `experimind-backup.timer` — daily at 02:30 UTC, persistent
  (a missed run while the server was off fires on next boot)
- **Output:** `/home/admin/backups/experimind_inventory_<UTC-stamp>.dump.gz`
  (plain SQL dump, gzipped, `--no-owner --no-privileges`)
- **Retention:** newest **14** backups; older files are deleted automatically
- **Log:** `/home/admin/backups/backup.log`

Credentials are read from `/home/admin/experimind-inventory/.env` (`DATABASE_URL`) —
nothing is hardcoded in the script or the systemd units.

### Verify a backup was taken

```bash
ssh -i inventory.pem admin@13.233.142.180 \
  "systemctl status experimind-backup.service; tail -5 /home/admin/backups/backup.log"
```

### Restore a backup (manual, real emergency)

```bash
# Stop writes first, then:
gunzip -c /home/admin/backups/experimind_inventory_<stamp>.dump.gz | \
  sudo -u postgres psql -d experimind_inventory -v ON_ERROR_STOP=1
```

## 2. Restore rehearsal (proves backups are usable)

- **Script:** `scripts/ops/restore-rehearsal.sh` (runs on the server, needs sudo)
- Restores the newest `.dump.gz` into a scratch database `experimind_restore_rehearsal`
  as the `postgres` superuser, compares public-table and `users` row counts with
  production, then **drops the scratch database**. Production is never modified.

```bash
ssh -i inventory.pem admin@13.233.142.180 \
  "cd /home/admin/experimind-inventory && sudo bash scripts/ops/restore-rehearsal.sh"
```

Expected output ends with `RESTORE REHEARSAL OK` and matching table/user counts.

## 3. Disk monitoring

- **Script:** `scripts/ops/disk-monitor.sh`
- **Schedule:** systemd timer `experimind-disk-monitor.timer` — 10 min after boot,
  then every 6 hours
- **Log:** `/home/admin/backups/disk-monitor.log`
- **Thresholds:**
  - `< 80%` — OK (exit 0)
  - `>= 80%` — WARNING logged (exit 1)
  - `>= 92%` — CRITICAL (exit 2): automatically prunes to the 3 newest backups and
    the 1 newest release snapshot, clears `apt-get clean`, vacuums journals older
    than 3 days, then re-checks. If still >= 92% it logs an ALERT for manual action.

The deploy pipeline also refuses to ship when the server disk is >= 90% full
(`deploy-aws.ps1` step 0).

## 4. Rollback

`deploy-aws.ps1` automatically snapshots the current release into
`/home/admin/releases/release_<UTC-stamp>.tar.gz` **before** extracting a new bundle
(keeps the 2 newest snapshots). To restore a previous release:

```powershell
# list snapshots and pick one interactively
.\scripts\rollback-aws.ps1

# or restore a specific snapshot directly
.\scripts\rollback-aws.ps1 -ReleaseFile release_20260924T120000Z.tar.gz
```

The rollback script extracts the snapshot over the app directory, reinstalls
production dependencies, reloads PM2, and runs the same health checks as the deploy
pipeline (`:3000/health` and `:3001`). It can also roll **forward** to any snapshot —
useful after a rehearsal.

### Rollback rehearsal procedure

1. Deploy normally (`scripts/deploy-aws.ps1`) — this snapshots the old release as
   `release_A` and leaves the new code running.
2. Snapshot the new release too: `release_B` (see Evidence log below for the one-liner).
3. `.\scripts\rollback-aws.ps1` → restores `release_A` — verify health checks pass.
4. `.\scripts\rollback-aws.ps1 -ReleaseFile release_B` → rolls forward to the new
   release — verify health checks pass. Production is left on the latest code.

## 5. Installing / refreshing the timers

The deploy pipeline refreshes the systemd units on every deploy (non-fatal). To
install or refresh them manually:

```bash
ssh -i inventory.pem admin@13.233.142.180 \
  "cd /home/admin/experimind-inventory && sudo bash scripts/ops/install-ops-timers.sh"
```

## Evidence log

| Date (UTC) | Rehearsal | Result |
| --- | --- | --- |
| _pending_ | Backup rotation + restore rehearsal | _pending_ |
| _pending_ | Deploy → rollback → roll-forward | _pending_ |
