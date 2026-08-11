#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
npm run verify
curl --fail --silent http://localhost:7006/health >/dev/null
curl --fail --silent http://localhost:7000/login >/dev/null
echo "Verified backend health at http://localhost:7006/health and frontend at http://localhost:7000/login"
