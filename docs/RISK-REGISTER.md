# Risk register

1. External communications, payment gateways, S3, malware scanning and enterprise MFA require deployment credentials and provider-specific adapters; local-safe paths are documented.
2. Seed credentials are intentionally for local development only and must be rotated before shared use.
3. Production operations require managed PostgreSQL backups, secret rotation, alerting, retention policies and a tested restore runbook.
4. The local Windows runner uses PostgreSQL port 5433 because port 5432 is occupied by another service; production connection settings must be supplied explicitly.
