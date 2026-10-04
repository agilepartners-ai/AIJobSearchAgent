#!/usr/bin/env bash
# Run ON the VM as root, from the folder holding these files:   sudo bash install.sh
# Idempotent: safe to run again after editing the script.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
sed -i 's/\r$//' "$here/pg-backup.sh" "$here/pg-backup.service" "$here/pg-backup.timer"

install -m 0750 -o root -g root "$here/pg-backup.sh" /usr/local/sbin/pg-backup.sh
install -m 0644 "$here/pg-backup.service" /etc/systemd/system/pg-backup.service
install -m 0644 "$here/pg-backup.timer" /etc/systemd/system/pg-backup.timer
install -d -m 0700 -o root -g root /var/backups/postgres

systemctl daemon-reload
systemctl enable --now pg-backup.timer

echo "--- first run now"
systemctl start pg-backup.service
journalctl -u pg-backup.service --no-pager -n 8 | sed 's/^.*pg-backup.sh\[[0-9]*\]: //'
echo "--- schedule"
systemctl list-timers pg-backup.timer --no-pager | head -3
