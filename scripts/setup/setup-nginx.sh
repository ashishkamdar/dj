#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[nginx]${NC} $*"; }
ok()    { echo -e "${GREEN}[nginx]${NC} $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

APP_PORT="${APP_PORT:-3456}"
APP_DOMAIN="${APP_DOMAIN:?APP_DOMAIN not set in config.env}"
SAAS_DOMAIN="${SAAS_DOMAIN:-}"

SITE_NAME="kachaapakka"
AVAILABLE="/etc/nginx/sites-available/$SITE_NAME"
ENABLED="/etc/nginx/sites-enabled/$SITE_NAME"

# ── Install nginx ───────────────────────────────────────────────────
if dpkg -s nginx &>/dev/null; then
  ok "nginx already installed."
else
  info "Installing nginx ..."
  apt-get install -y nginx
fi

# ── Build server_name directive ─────────────────────────────────────
if [[ -n "$SAAS_DOMAIN" ]]; then
  SERVER_NAMES="*.${SAAS_DOMAIN} ${APP_DOMAIN}"
else
  SERVER_NAMES="${APP_DOMAIN}"
fi

# ── Generate config ─────────────────────────────────────────────────
info "Writing nginx config to $AVAILABLE ..."
cat > "$AVAILABLE" <<NGINX
# Rate limiting zone: 10 requests/sec per IP
limit_req_zone \$binary_remote_addr zone=applimit:10m rate=10r/s;

server {
    listen 80;
    server_name ${SERVER_NAMES};

    # Redirect to HTTPS (certbot will update this block)
    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name ${SERVER_NAMES};

    # SSL certs will be managed by certbot
    # Placeholder — certbot --nginx will replace these
    ssl_certificate     /etc/ssl/certs/ssl-cert-snakeoil.pem;
    ssl_certificate_key /etc/ssl/private/ssl-cert-snakeoil.key;

    # ── Gzip ────────────────────────────────────────────────────────
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 256;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/json
        application/javascript
        application/xml
        application/rss+xml
        image/svg+xml;

    # ── Rate limiting ───────────────────────────────────────────────
    limit_req zone=applimit burst=20 nodelay;

    # ── Proxy to app ────────────────────────────────────────────────
    location / {
        proxy_pass http://127.0.0.1:${APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINX

# ── Enable site ─────────────────────────────────────────────────────
# Remove default site if present
rm -f /etc/nginx/sites-enabled/default

if [[ -L "$ENABLED" ]]; then
  ok "Site already enabled."
else
  ln -s "$AVAILABLE" "$ENABLED"
  ok "Site symlinked to sites-enabled."
fi

# ── Test & reload ───────────────────────────────────────────────────
info "Testing nginx config ..."
nginx -t

info "Reloading nginx ..."
systemctl enable nginx
systemctl reload nginx

ok "Nginx setup finished."
