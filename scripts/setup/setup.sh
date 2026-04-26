#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_DIR="/etc/kachaapakka"
CONFIG_FILE="$CONFIG_DIR/config.env"

# ── Colours ─────────────────────────────────────────────────────────
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Colour

info()  { echo -e "${CYAN}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }

# ── Must run as root ────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

# ── Load existing config if present ────────────────────────────────
if [[ -f "$CONFIG_FILE" ]]; then
  info "Found existing config at $CONFIG_FILE — loading defaults from it."
  set -a; source "$CONFIG_FILE"; set +a
fi

# ── Interactive prompts ─────────────────────────────────────────────
read_with_default() {
  local prompt="$1" default="$2" varname="$3"
  local current="${!varname:-$default}"
  read -rp "$prompt [$current]: " value
  eval "$varname=\"${value:-$current}\""
}

echo ""
echo "============================================="
echo "  Kacha Pakka — Server Provisioning"
echo "============================================="
echo ""

read_with_default "App domain"                        "dj.areakpi.in"                          APP_DOMAIN
read_with_default "SaaS wildcard domain (empty=none)" ""                                       SAAS_DOMAIN
read_with_default "App port"                          "3456"                                    APP_PORT
read_with_default "Git repo URL"                      "https://github.com/ashishkamdar/dj.git" GIT_REPO_URL
read_with_default "App directory"                     "/var/www/kachaapakka"                    APP_DIR
read_with_default "Super-admin email"                 "${SUPER_ADMIN_EMAIL:-}"                  SUPER_ADMIN_EMAIL
read_with_default "Super-admin password"              "${SUPER_ADMIN_PASSWORD:-}"               SUPER_ADMIN_PASSWORD

# Auto-generate PG password if not set
PG_PASSWORD="${PG_PASSWORD:-}"
read_with_default "PostgreSQL app password (auto-gen if empty)" "$PG_PASSWORD" PG_PASSWORD
if [[ -z "$PG_PASSWORD" ]]; then
  PG_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
  info "Auto-generated PostgreSQL password."
fi

# ── Persist config ──────────────────────────────────────────────────
mkdir -p "$CONFIG_DIR"
cat > "$CONFIG_FILE" <<EOF
# Kacha Pakka — server config (auto-generated)
APP_DOMAIN="${APP_DOMAIN}"
SAAS_DOMAIN="${SAAS_DOMAIN}"
APP_PORT="${APP_PORT}"
GIT_REPO_URL="${GIT_REPO_URL}"
APP_DIR="${APP_DIR}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD}"
PG_PASSWORD="${PG_PASSWORD}"
EOF
chmod 600 "$CONFIG_FILE"
ok "Config saved to $CONFIG_FILE"

# ── Run sub-scripts in order ────────────────────────────────────────
for script in \
  setup-system.sh \
  setup-node.sh \
  setup-postgres.sh \
  setup-nginx.sh \
  setup-ssl.sh \
  setup-app.sh \
  setup-backups.sh; do
  echo ""
  info "Running $script ..."
  bash "$SCRIPT_DIR/$script"
  ok "$script complete."
done

echo ""
echo "============================================="
echo "  Setup complete!"
echo "  App should be running at https://${APP_DOMAIN}"
echo "============================================="
