#!/usr/bin/env bash
# Restore rehearsal: prove the newest backup actually restores.
#
# Restores the newest .dump.gz into a scratch database (as the postgres
# superuser, so extension/owner statements apply cleanly), compares table
# and row counts with production, then drops the scratch database.
# The production database is never modified.
set -euo pipefail

APP_DIR="/home/admin/experimind-inventory"
BACKUP_DIR="/home/admin/backups"
SCRATCH="experimind_restore_rehearsal"
LOG_FILE="$BACKUP_DIR/backup.log"

DATABASE_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -n1 | cut -d= -f2- | tr -d '\r')"
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL not found in $APP_DIR/.env" >&2
  exit 1
fi
DB_NAME="$(echo "$DATABASE_URL" | sed -E 's|.*/([^/?]+)(\?.*)?$|\1|')"

LATEST="$(ls -1t "$BACKUP_DIR"/experimind_inventory_*.dump.gz 2>/dev/null | head -n1)"
if [ -z "$LATEST" ]; then
  echo "ERROR: no .dump.gz backup found in $BACKUP_DIR" >&2
  exit 1
fi

echo "Rehearsing restore of: $LATEST (production db: $DB_NAME)"

sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $SCRATCH;" >/dev/null
sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $SCRATCH;" >/dev/null

if ! gunzip -c "$LATEST" | sudo -u postgres psql -d "$SCRATCH" -v ON_ERROR_STOP=1 -q >"$BACKUP_DIR/restore-rehearsal.psql.log" 2>&1; then
  sudo -u postgres psql -d postgres -c "DROP DATABASE IF EXISTS $SCRATCH;" >/dev/null
  echo "ERROR: restore failed, see $BACKUP_DIR/restore-rehearsal.psql.log" >&2
  exit 1
fi

PROD_TABLES="$(sudo -u postgres psql -d "$DB_NAME" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
SCRATCH_TABLES="$(sudo -u postgres psql -d "$SCRATCH" -Atc "SELECT count(*) FROM pg_tables WHERE schemaname = 'public';")"
PROD_USERS="$(sudo -u postgres psql -d "$DB_NAME" -Atc "SELECT count(*) FROM public.users;")"
SCRATCH_USERS="$(sudo -u postgres psql -d "$SCRATCH" -Atc "SELECT count(*) FROM public.users;")"

sudo -u postgres psql -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE $SCRATCH;" >/dev/null

echo "Production tables: $PROD_TABLES | Restored tables: $SCRATCH_TABLES"
echo "Production users:  $PROD_USERS | Restored users:  $SCRATCH_USERS"

if [ "$PROD_TABLES" -ne "$SCRATCH_TABLES" ] || [ "$PROD_USERS" -ne "$SCRATCH_USERS" ]; then
  echo "RESTORE REHEARSAL FAILED: counts differ" >&2
  exit 1
fi

echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) RESTORE REHEARSAL OK: $LATEST (tables=$SCRATCH_TABLES users=$SCRATCH_USERS)" >> "$LOG_FILE"
echo "RESTORE REHEARSAL OK"
