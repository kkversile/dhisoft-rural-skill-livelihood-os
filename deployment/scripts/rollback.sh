#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"
[[ "${ROLLBACK_APPROVED:-}" == "YES" ]] || { echo "Set ROLLBACK_APPROVED=YES after reviewing the target image tags." >&2; exit 1; }
[[ -n "${BACKEND_IMAGE:-}" && -n "${FRONTEND_IMAGE:-}" ]] || { echo "Set BACKEND_IMAGE and FRONTEND_IMAGE to known-good immutable images." >&2; exit 1; }
"$ROOT_DIR/deployment/scripts/preflight.sh"
docker compose --env-file deployment/.env.production -f deployment/docker-compose.production.yml up -d backend outbox-worker event-consumer-worker certificate-worker frontend nginx
"$ROOT_DIR/deployment/scripts/health-check.sh"
echo "Rollback image set is running. Database migrations are intentionally not reverted."
