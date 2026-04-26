#!/usr/bin/env bash
set -euo pipefail

CONFIG_FILE="/etc/kachaapakka/config.env"
[[ -f "$CONFIG_FILE" ]] && { set -a; source "$CONFIG_FILE"; set +a; }

GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[system]${NC} $*"; }
ok()    { echo -e "${GREEN}[system]${NC} $*"; }

# ── Must run as root ────────────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root (sudo)." >&2
  exit 1
fi

# ── Apt update & upgrade ───────────────────────────────────────────
info "Updating packages ..."
apt-get update -y
apt-get upgrade -y

# ── Essential packages ──────────────────────────────────────────────
PACKAGES=(curl git build-essential ufw software-properties-common)
for pkg in "${PACKAGES[@]}"; do
  if dpkg -s "$pkg" &>/dev/null; then
    ok "$pkg already installed."
  else
    info "Installing $pkg ..."
    apt-get install -y "$pkg"
  fi
done

# ── Firewall (UFW) ─────────────────────────────────────────────────
info "Configuring UFW ..."
ufw allow 22/tcp   >/dev/null 2>&1 || true
ufw allow 80/tcp   >/dev/null 2>&1 || true
ufw allow 443/tcp  >/dev/null 2>&1 || true

if ufw status | grep -q "Status: active"; then
  ok "UFW already active."
else
  info "Enabling UFW ..."
  echo "y" | ufw enable
fi

# ── Swap (if RAM < 2 GB) ───────────────────────────────────────────
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_MB=$((TOTAL_RAM_KB / 1024))

if [[ $TOTAL_RAM_MB -lt 2048 ]]; then
  SWAPFILE="/swapfile"
  if swapon --show | grep -q "$SWAPFILE"; then
    ok "Swap already active at $SWAPFILE."
  else
    info "Creating 2 GB swap file (RAM is ${TOTAL_RAM_MB} MB) ..."
    fallocate -l 2G "$SWAPFILE"
    chmod 600 "$SWAPFILE"
    mkswap "$SWAPFILE"
    swapon "$SWAPFILE"
    # Persist across reboots
    if ! grep -q "$SWAPFILE" /etc/fstab; then
      echo "$SWAPFILE none swap sw 0 0" >> /etc/fstab
    fi
    ok "Swap enabled."
  fi
else
  ok "RAM is ${TOTAL_RAM_MB} MB — swap not needed."
fi

ok "System setup finished."
