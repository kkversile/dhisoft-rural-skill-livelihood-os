#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
BASE_URL="${BASE_URL:-http://127.0.0.1}"
curl --fail --silent --show-error "$BASE_URL/health/live" >/dev/null
curl --fail --silent --show-error "$BASE_URL/health/ready" >/dev/null
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml ps
echo "Health checks passed."
