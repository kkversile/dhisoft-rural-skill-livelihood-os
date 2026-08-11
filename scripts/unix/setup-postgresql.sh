#!/usr/bin/env bash
set -euo pipefail

if command -v psql >/dev/null 2>&1; then
  psql --version
  echo "PostgreSQL client found. Set DATABASE_URL and DIRECT_URL in dhisoft-rural-skill-backend/.env, then run npm run db:setup."
  exit 0
fi

if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y postgresql postgresql-contrib
  sudo systemctl enable --now postgresql
elif command -v brew >/dev/null 2>&1; then
  brew install postgresql@17
  brew services start postgresql@17
else
  echo "Install PostgreSQL 15+ from https://www.postgresql.org/download/ for this operating system, then rerun this script." >&2
  exit 1
fi

psql --version
echo "PostgreSQL is installed. Set DATABASE_URL and DIRECT_URL, then run npm run db:setup."
