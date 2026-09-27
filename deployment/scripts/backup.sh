#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"
[[ -f deployment/.env.production ]] || { echo "Missing deployment/.env.production" >&2; exit 1; }
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml exec -T postgres \
  pg_dump --no-owner --no-privileges -U "${POSTGRES_USER:?POSTGRES_USER is required}" "${POSTGRES_DB:?POSTGRES_DB is required}" \
  > "$BACKUP_DIR/postgres-$STAMP.sql"
echo "Database backup written to $BACKUP_DIR/postgres-$STAMP.sql"
