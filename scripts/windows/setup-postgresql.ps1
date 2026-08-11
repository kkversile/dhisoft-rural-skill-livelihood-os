$ErrorActionPreference = 'Stop'
$psql = Get-Command psql -ErrorAction SilentlyContinue
$service = Get-Service -Name 'postgresql*' -ErrorAction SilentlyContinue | Where-Object Status -eq 'Running' | Select-Object -First 1

if ($psql) {
  & $psql.Source --version
  Write-Host 'PostgreSQL client found. Set DATABASE_URL and DIRECT_URL in dhisoft-rural-skill-backend\.env, then run npm run db:setup.'
  exit 0
}

if ($service) {
  Write-Host "PostgreSQL service $($service.Name) is running, but psql is not on PATH. Add the PostgreSQL bin directory to PATH and rerun this check."
  exit 0
}

if (Get-Command winget -ErrorAction SilentlyContinue) {
  Write-Host 'PostgreSQL was not detected. Installing the official PostgreSQL 17 package with winget.'
  winget install --id PostgreSQL.PostgreSQL.17 --exact --source winget --accept-source-agreements --accept-package-agreements
  Write-Host 'Restart this shell so psql is available, then rerun this script and npm run db:setup.'
  exit 0
}

throw 'PostgreSQL is not installed and winget is unavailable. Install PostgreSQL 15+ from https://www.postgresql.org/download/windows/ and rerun this script.'
