#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[node]${NC}  $*"; }
ok()    { echo -e "${GREEN}[node]${NC}  $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

export NVM_DIR="/root/.nvm"
NODE_VERSION="24"

# ── Install nvm ─────────────────────────────────────────────────────
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  ok "nvm already installed."
else
  info "Installing nvm ..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

# Source nvm so it's available in this shell
# shellcheck source=/dev/null
source "$NVM_DIR/nvm.sh"

# ── Install Node.js ─────────────────────────────────────────────────
if nvm ls "$NODE_VERSION" &>/dev/null; then
  ok "Node.js $NODE_VERSION already installed."
else
  info "Installing Node.js $NODE_VERSION ..."
  nvm install "$NODE_VERSION"
fi
nvm alias default "$NODE_VERSION"
nvm use "$NODE_VERSION"

info "Node version: $(node --version)"
info "npm version:  $(npm --version)"

# ── Install PM2 globally ───────────────────────────────────────────
if command -v pm2 &>/dev/null; then
  ok "PM2 already installed."
else
  info "Installing PM2 globally ..."
  npm install -g pm2
fi

# ── PM2 startup (boot persistence) ─────────────────────────────────
info "Configuring PM2 startup ..."
pm2 startup systemd -u root --hp /root 2>/dev/null || true

ok "Node.js setup finished."
