#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
[[ "${DEPLOY_APPROVED:-}" == "YES" ]] || { echo "Set DEPLOY_APPROVED=YES after reviewing the release." >&2; exit 1; }
"$ROOT_DIR/deployment/scripts/preflight.sh"
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml pull
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml run --rm backend npx prisma migrate deploy
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml up -d
"$ROOT_DIR/deployment/scripts/health-check.sh"
