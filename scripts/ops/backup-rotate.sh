#!/usr/bin/env bash
# Daily PostgreSQL backup with rotation for Experimind Labs Inventory.
# Installed as a systemd timer (see scripts/ops/systemd/experimind-backup.timer).
set -euo pipefail

APP_DIR="/home/admin/experimind-inventory"
BACKUP_DIR="/home/admin/backups"
KEEP=14
LOG_FILE="$BACKUP_DIR/backup.log"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

# Read the connection string from the application .env (no hardcoded credentials).
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
if [ -z "$DATABASE_URL" ]; then
  log "ERROR: DATABASE_URL not found in $APP_DIR/.env"
  exit 1
fi

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/experimind_inventory_${STAMP}.dump.gz"

if ! pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$OUT"; then
  rm -f "$OUT"
  log "ERROR: pg_dump failed for $STAMP"
  exit 1
fi

if [ ! -s "$OUT" ]; then
  rm -f "$OUT"
  log "ERROR: backup file is empty for $STAMP"
  exit 1
fi

# Rotate: keep only the newest $KEEP backups.
ls -1t "$BACKUP_DIR"/experimind_inventory_*.dump* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

COUNT="$(ls -1 "$BACKUP_DIR"/experimind_inventory_*.dump* 2>/dev/null | wc -l)"
log "OK backup $OUT ($(du -h "$OUT" | cut -f1)), $COUNT backups retained"
