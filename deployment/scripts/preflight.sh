#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
command -v docker >/dev/null || { echo "docker is required" >&2; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose v2 is required" >&2; exit 1; }
[[ -f deployment/.env.production ]] || { echo "Missing deployment/.env.production" >&2; exit 1; }
if grep -Eq 'CHANGE_ME|example\.com|ghcr\.io/example' deployment/.env.production; then
  echo "Production env still contains a placeholder." >&2
  exit 1
fi
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml config >/dev/null
echo "Preflight passed."
