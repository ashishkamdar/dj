#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[app]${NC}   $*"; }
ok()    { echo -e "${GREEN}[app]${NC}   $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

APP_DIR="${APP_DIR:?APP_DIR not set in config.env}"
APP_PORT="${APP_PORT:-3456}"
GIT_REPO_URL="${GIT_REPO_URL:?GIT_REPO_URL not set in config.env}"
PG_PASSWORD="${PG_PASSWORD:?PG_PASSWORD not set in config.env}"
SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:?SUPER_ADMIN_EMAIL not set in config.env}"
SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:?SUPER_ADMIN_PASSWORD not set in config.env}"
SAAS_DOMAIN="${SAAS_DOMAIN:-}"

# Source nvm so node/npm/npx are available
export NVM_DIR="/root/.nvm"
# shellcheck source=/dev/null
[[ -s "$NVM_DIR/nvm.sh" ]] && source "$NVM_DIR/nvm.sh"

# ── Clone or pull repo ──────────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  info "Repo already cloned — pulling latest ..."
  cd "$APP_DIR"
  git pull --ff-only
else
  info "Cloning repo to $APP_DIR ..."
  mkdir -p "$(dirname "$APP_DIR")"
  git clone "$GIT_REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ── Create .env file ───────────────────────────────────────────────
info "Writing .env file ..."
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=${APP_PORT}
DATABASE_URL=postgresql://kachaapakka_app:${PG_PASSWORD}@localhost:5432/kachaapakka
SUPER_ADMIN_EMAIL=${SUPER_ADMIN_EMAIL}
SUPER_ADMIN_PASSWORD=${SUPER_ADMIN_PASSWORD}
SAAS_DOMAIN=${SAAS_DOMAIN}
EOF
chmod 600 "$APP_DIR/.env"
ok ".env written."

# ── Install dependencies ────────────────────────────────────────────
info "Installing npm dependencies ..."
cd "$APP_DIR"
npm install

# ── Database migrations & seed ──────────────────────────────────────
info "Running drizzle-kit push (create/update tables) ..."
npx drizzle-kit push

info "Setting up RLS policies ..."
npx tsx src/db/rls.ts

info "Seeding database ..."
npm run db:seed

# ── Build ───────────────────────────────────────────────────────────
info "Building app ..."
npm run build

# ── PM2 start / restart ────────────────────────────────────────────
APP_NAME="kachaapakka"

if pm2 describe "$APP_NAME" &>/dev/null; then
  info "Restarting $APP_NAME in PM2 ..."
  pm2 restart "$APP_NAME" --update-env
else
  info "Starting $APP_NAME in PM2 ..."
  pm2 start npm --name "$APP_NAME" -- start
fi

pm2 save

ok "App setup finished. Running on port ${APP_PORT}."
