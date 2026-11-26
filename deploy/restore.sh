#!/usr/bin/env bash
# Puts a backup back in place of the current database.
#
#   sudo bash deploy/restore.sh                 lists the backups on this server
#   sudo bash deploy/restore.sh latest          restores the newest one
#   sudo bash deploy/restore.sh wakeset-20260101-031700.db
#
# The site is stopped for the few seconds this takes. The backup is checked
# before anything is changed, and the database as it was is set aside in
# /data/backups as before-restore-<time>.db, so a restore can be undone by
# restoring that file.
set -euo pipefail
cd "$(dirname "$0")"
TOOL="node scripts/backup.mjs"
quiet() { grep -v -e ExperimentalWarning -e trace-warnings; }
if [ $# -eq 0 ]; then
  docker compose run --rm --no-deps -T app $TOOL list 2>&1 | quiet
  echo
  echo "To restore one: sudo bash deploy/restore.sh latest   (or a file name from the list)"
  exit 0
fi
# Check first, with the site still up: a bad backup stops here.
docker compose run --rm --no-deps -T app $TOOL verify "$1" 2>&1 | quiet
read -r -p "Replace the current database with this backup? Type yes: " answer
[ "$answer" = "yes" ] || { echo "Nothing was changed."; exit 0; }
docker compose stop app
docker compose run --rm --no-deps -T app $TOOL restore "$1" 2>&1 | quiet
docker compose up -d --no-build app
echo "The site is back up on the restored data."
