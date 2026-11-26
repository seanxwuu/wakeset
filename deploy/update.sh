#!/usr/bin/env bash
# Pull the latest code from GitHub and restart WakeSet. Data is kept.
#   sudo bash deploy/update.sh
#
# The app is built on GitHub after every merge (.github/workflows/image.yml).
# This script downloads that build, which takes about a minute. If it can't
# (the image is not public, or the build failed), it falls back to building
# here, which works but is slow on a small machine.
set -euo pipefail
cd "$(dirname "$0")"
bash ./backup.sh || echo "Backup failed; continuing with the update."
# The checkout belongs to the login user, so pull as them.
OWNER="$(stat -c %U ..)"
sudo -u "$OWNER" git -C .. pull --ff-only
export WAKESET_TAG="$(sudo -u "$OWNER" git -C .. rev-parse HEAD)"

downloaded=""
for attempt in 1 2 3 4 5 6; do
  if docker compose pull app 2>/dev/null; then downloaded=1; break; fi
  # If even the newest published build can't be downloaded, waiting won't help.
  if ! docker manifest inspect ghcr.io/seanxwuu/wakeset:latest >/dev/null 2>&1; then break; fi
  echo "The build for this version isn't ready on GitHub yet. Checking again in a minute ($attempt of 6)."
  sleep 60
done

if [ -n "$downloaded" ]; then
  docker compose up -d --no-build
else
  echo "Couldn't download the prebuilt app, so building it here. This is slow; see the README (Deploy) to fix it."
  docker compose up -d --build
fi
# Old app versions pile up (about a gigabyte each) and a full disk breaks updates.
docker image prune -af >/dev/null
docker builder prune -af >/dev/null 2>&1 || true
echo "Updated."
