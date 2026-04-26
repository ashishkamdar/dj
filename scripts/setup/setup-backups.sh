#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[backup]${NC} $*"; }
ok()    { echo -e "${GREEN}[backup]${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

BACKUP_DIR="/var/backups/kachaapakka"
CRON_FILE="/etc/cron.d/kachaapakka-backup"
DB_NAME="kachaapakka"

# ── Create backup directory ─────────────────────────────────────────
mkdir -p "$BACKUP_DIR"
chown postgres:postgres "$BACKUP_DIR"
ok "Backup directory: $BACKUP_DIR"

# ── Write cron jobs (idempotent — overwrites file each time) ────────
info "Writing cron jobs to $CRON_FILE ..."
cat > "$CRON_FILE" <<'CRON'
# Kacha Pakka — daily database backup at 2:00 AM
0 2 * * * postgres pg_dump kachaapakka | gzip > /var/backups/kachaapakka/backup-$(date +\%Y\%m\%d).sql.gz

# Cleanup backups older than 30 days at 3:00 AM
0 3 * * * root find /var/backups/kachaapakka -name "backup-*.sql.gz" -mtime +30 -delete
CRON

chmod 644 "$CRON_FILE"
ok "Cron jobs installed at $CRON_FILE"

ok "Backup setup finished."
