#!/usr/bin/env bash
# One-time setup of WakeSet on a small Linux VM (written for Debian 12 on a
# Google Cloud e2-micro). Run from a checkout of the repo:
#
#   sudo SITE_ADDRESS=wakeset.duckdns.org bash deploy/setup-vm.sh
#
# Add DUCKDNS_TOKEN=<your token> to have the server keep that DuckDNS name
# pointed at itself (needed when the machine's public address can change).
# With no SITE_ADDRESS it uses a free sslip.io name made from the address.
#
# It adds swap (the build needs more than 1 GB), installs Docker, writes the
# server's settings to deploy/.env, builds and starts WakeSet with HTTPS, and
# schedules a nightly database backup. Safe to run again: it keeps an
# existing .env and never regenerates the secret.
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then echo "Run with sudo."; exit 1; fi
cd "$(dirname "$0")"
DEPLOY_DIR="$(pwd)"

echo "==> Swap"
if ! swapon --show | grep -q /swapfile; then
  if [ ! -f /swapfile ]; then fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null; fi
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Docker"
if ! command -v docker >/dev/null; then
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl >/dev/null
  install -m 0755 -d /etc/apt/keyrings
  . /etc/os-release
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null
fi

echo "==> Settings"
if [ ! -f .env ]; then
  if [ -z "${SITE_ADDRESS:-}" ]; then
    IP="$(curl -fsS -m 5 -H 'Metadata-Flavor: Google' http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip 2>/dev/null || curl -fsS -m 5 https://api.ipify.org)"
    SITE_ADDRESS="${IP//./-}.sslip.io"
  fi
  umask 077
  cat > .env <<ENV
SITE_ADDRESS=${SITE_ADDRESS}
WAKESET_SECRET=$(openssl rand -hex 32)
# Set a Claude API key here to switch Spotter on, then: sudo docker compose up -d
ANTHROPIC_API_KEY=
ENV
  echo "Wrote ${DEPLOY_DIR}/.env"
else
  echo "Keeping existing ${DEPLOY_DIR}/.env"
fi
SITE_ADDRESS="$(grep '^SITE_ADDRESS=' .env | cut -d= -f2)"

# DuckDNS: point the name at this machine now, and again every five minutes
# in case the address changes. An empty ip= means "the address this came from".
if [ -n "${DUCKDNS_TOKEN:-}" ] && [[ "$SITE_ADDRESS" == *.duckdns.org ]]; then
  echo "==> DuckDNS"
  NAME="${SITE_ADDRESS%.duckdns.org}"
  URL="https://www.duckdns.org/update?domains=${NAME}&token=${DUCKDNS_TOKEN}&ip="
  echo "DuckDNS says: $(curl -fsS -m 10 "$URL" || echo failed)"
  ( umask 077; echo "*/5 * * * * root curl -fsS -m 10 '${URL}' >/dev/null 2>&1" > /etc/cron.d/wakeset-duckdns )
fi

echo "==> Build and start (the first build takes 5 to 15 minutes on a small machine)"
docker compose up -d --build

echo "==> Nightly backup at 03:17, 14 kept"
cat > /etc/cron.d/wakeset-backup <<CRON
17 3 * * * root bash ${DEPLOY_DIR}/backup.sh >> /var/log/wakeset-backup.log 2>&1
CRON

echo
echo "Done. Give the certificate a minute, then open:"
echo "  https://${SITE_ADDRESS}"
echo "Keep ${DEPLOY_DIR}/.env safe: WAKESET_SECRET in it signs everyone's sign-in cookie."
