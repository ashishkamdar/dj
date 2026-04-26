#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[1;33m'; NC='\033[0m'
info()  { echo -e "${CYAN}[ssl]${NC}   $*"; }
ok()    { echo -e "${GREEN}[ssl]${NC}   $*"; }
warn()  { echo -e "${YELLOW}[ssl]${NC}   $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN not set in config.env}"
SAAS_DOMAIN="${SAAS_DOMAIN:-}"
ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:?SUPER_ADMIN_EMAIL not set in config.env}"

# ── Install certbot ─────────────────────────────────────────────────
if command -v certbot &>/dev/null; then
  ok "certbot already installed."
else
  info "Installing certbot ..."
  apt-get install -y certbot python3-certbot-nginx
fi

# ── Obtain cert for APP_DOMAIN ──────────────────────────────────────
if [[ -d "/etc/letsencrypt/live/${APP_DOMAIN}" ]]; then
  ok "Certificate for ${APP_DOMAIN} already exists."
else
  info "Requesting certificate for ${APP_DOMAIN} ..."
  certbot --nginx \
    -d "${APP_DOMAIN}" \
    --non-interactive \
    --agree-tos \
    -m "${ADMIN_EMAIL}"
fi

# ── Wildcard cert for SaaS domain (manual DNS challenge) ────────────
if [[ -n "$SAAS_DOMAIN" ]]; then
  echo ""
  warn "============================================="
  warn "  WILDCARD CERTIFICATE REQUIRED"
  warn "============================================="
  warn ""
  warn "A wildcard cert for *.${SAAS_DOMAIN} requires a DNS-01 challenge."
  warn "Run the following command manually and follow the prompts:"
  warn ""
  warn "  sudo certbot certonly \\"
  warn "    --manual \\"
  warn "    --preferred-challenges dns \\"
  warn "    -d '*.${SAAS_DOMAIN}' \\"
  warn "    -d '${SAAS_DOMAIN}' \\"
  warn "    --agree-tos \\"
  warn "    -m ${ADMIN_EMAIL}"
  warn ""
  warn "You will need to create a DNS TXT record as instructed."
  warn "After obtaining the cert, update the nginx config with the"
  warn "correct certificate paths and reload nginx."
  warn "============================================="
  echo ""
fi

# ── Auto-renewal (certbot installs a systemd timer by default) ──────
if systemctl is-enabled certbot.timer &>/dev/null; then
  ok "Certbot auto-renewal timer is enabled."
else
  info "Enabling certbot auto-renewal timer ..."
  systemctl enable --now certbot.timer 2>/dev/null || true
fi

ok "SSL setup finished."
