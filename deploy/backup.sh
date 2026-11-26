#!/usr/bin/env bash
# Writes a consistent copy of the database to the data volume and keeps the
# newest 14. These live on the same disk as the database, so they protect
# against a bad update or accidental deletion, not against losing the disk.
# For that, also turn on scheduled disk snapshots in the cloud console.
set -euo pipefail
cd "$(dirname "$0")"
docker compose exec -T app node scripts/backup.mjs backup 2>&1 | grep -v -e ExperimentalWarning -e trace-warnings
