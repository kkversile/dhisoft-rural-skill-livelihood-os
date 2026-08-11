# Known limitations

The local application is runnable and its Phase 1A domain slice is backed by PostgreSQL, NestJS, Next.js, migrations, seed data and automated checks.

Deployment-specific configuration remains for email/SMS/WhatsApp delivery, payment gateway credentials, S3-compatible storage credentials, Redis/BullMQ, malware scanning and administrative MFA enforcement. Local filesystem storage and the database-backed job path are available for development.

The local runner uses an isolated PostgreSQL 17 cluster on port 5433 because the machine’s existing Windows PostgreSQL service owns 5432. Production deployments should use a managed PostgreSQL endpoint and rotate all local seed credentials.
