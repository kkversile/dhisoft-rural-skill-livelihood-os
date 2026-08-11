#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
echo "Starting frontend on http://localhost:7000 and backend on http://localhost:7006"
npm run dev
