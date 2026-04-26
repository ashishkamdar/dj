#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[pg]${NC}    $*"; }
ok()    { echo -e "${GREEN}[pg]${NC}    $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

DB_NAME="kachaapakka"
DB_USER="kachaapakka_app"
DB_PASS="${PG_PASSWORD:?PG_PASSWORD not set in config.env}"

# ── Install PostgreSQL ──────────────────────────────────────────────
if dpkg -s postgresql &>/dev/null; then
  ok "PostgreSQL already installed."
else
  info "Installing PostgreSQL ..."
  apt-get install -y postgresql postgresql-contrib
fi

# Ensure the service is running
systemctl enable postgresql
systemctl start postgresql

# ── Create database (if not exists) ────────────────────────────────
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  ok "Database '$DB_NAME' already exists."
else
  info "Creating database '$DB_NAME' ..."
  sudo -u postgres createdb "$DB_NAME"
fi

# ── Create user (if not exists) ─────────────────────────────────────
if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  ok "User '$DB_USER' already exists — updating password."
  sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$DB_PASS';"
else
  info "Creating user '$DB_USER' ..."
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
fi

# ── Grant privileges (idempotent) ───────────────────────────────────
info "Granting privileges ..."
sudo -u postgres psql -d "$DB_NAME" <<SQL
-- Database-level
GRANT CONNECT ON DATABASE $DB_NAME TO $DB_USER;

-- Schema-level
GRANT USAGE, CREATE ON SCHEMA public TO $DB_USER;

-- Table & sequence privileges (current + future)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
SQL

ok "PostgreSQL setup finished. User '$DB_USER' does NOT have SUPERUSER (RLS enforced)."
