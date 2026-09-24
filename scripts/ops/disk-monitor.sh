#!/usr/bin/env bash
# Root filesystem usage monitor with emergency pruning.
# Installed as a systemd timer (see scripts/ops/systemd/experimind-disk-monitor.timer).
# Exit codes: 0 = OK, 1 = warning, 2 = critical even after pruning (manual action needed).
set -uo pipefail

WARN_PCT=80
CRIT_PCT=92
BACKUP_DIR="/home/admin/backups"
RELEASES_DIR="/home/admin/releases"
LOG_FILE="$BACKUP_DIR/disk-monitor.log"

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" >> "$LOG_FILE"; }
mkdir -p "$BACKUP_DIR"

pct() { df -P / | awk 'NR==2 {gsub(/%/, ""); print $5}'; }

USAGE="$(pct)"

if [ "$USAGE" -lt "$WARN_PCT" ]; then
  log "OK disk ${USAGE}%"
  exit 0
fi

if [ "$USAGE" -lt "$CRIT_PCT" ]; then
  log "WARNING disk ${USAGE}% (threshold ${WARN_PCT}%)"
  exit 1
fi

log "CRITICAL disk ${USAGE}% (threshold ${CRIT_PCT}%) - starting emergency pruning"

# Keep only the 3 newest database backups.
ls -1t "$BACKUP_DIR"/experimind_inventory_*.dump* 2>/dev/null | tail -n +4 | xargs -r rm -f
# Keep only the newest rollback release snapshot.
ls -1t "$RELEASES_DIR"/release_*.tar.gz 2>/dev/null | tail -n +2 | xargs -r rm -f
# Clear apt package cache and trim old journal logs (passwordless sudo).
sudo apt-get clean 2>/dev/null || true
sudo journalctl --vacuum-time=3d 2>/dev/null || true

AFTER="$(pct)"
log "CRITICAL pruning complete, disk now ${AFTER}%"
if [ "$AFTER" -ge "$CRIT_PCT" ]; then
  log "ALERT disk still ${AFTER}% after pruning - manual intervention required"
  exit 2
fi
