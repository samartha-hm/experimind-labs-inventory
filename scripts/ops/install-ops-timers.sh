#!/usr/bin/env bash
# Installs the backup-rotation and disk-monitor systemd units (idempotent).
# Run once on the server: sudo bash scripts/ops/install-ops-timers.sh
set -euo pipefail

APP_DIR="/home/admin/experimind-inventory"
UNIT_SRC="$APP_DIR/scripts/ops/systemd"
UNIT_DST="/etc/systemd/system"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo bash $0" >&2
  exit 1
fi

for unit in experimind-backup.service experimind-backup.timer \
            experimind-disk-monitor.service experimind-disk-monitor.timer; do
  install -m 0644 "$UNIT_SRC/$unit" "$UNIT_DST/$unit"
  # Guard against CRLF line endings breaking systemd parsing.
  sed -i 's/\r$//' "$UNIT_DST/$unit"
done

systemctl daemon-reload
systemctl enable --now experimind-backup.timer experimind-disk-monitor.timer

echo "Installed and started:"
systemctl list-timers --no-pager | grep experimind || true
