# Production deployment template

This directory contains deployment preparation only. Nothing here was run by
the local development validation, and nothing was deployed to DigitalOcean.
The production topology keeps the backend and workers on private Docker
networking, with Nginx as the only public entry point.

Before use on a server:

1. Build and publish the backend and frontend images, then set `BACKEND_IMAGE`
   and `FRONTEND_IMAGE` in the host environment.
2. Copy `.env.production.example` to `.env.production`, replace every
   placeholder, and keep that file out of version control.
3. Provision managed PostgreSQL, S3/Spaces, SQS/EventBridge, Redpanda/Kafka,
   Redis, TLS, and backups according to the provider security policy. The
   template persists its local PostgreSQL and Redis volumes; managed services
   remain responsible for their own durability.
4. Run Prisma migrations from the release image before starting application
   traffic: `node node_modules/prisma/build/index.js migrate deploy`.
5. Validate `/health/live` and `/health/ready`, queue/DLQ alarms, outbox lag,
   database backups, and rollback image tags before switching DNS.

The compose file is intentionally not a local- or cloud-provider bootstrap:
it does not contain credentials, seed commands, public database ports, or a
deployment command. Use the runbook in `docs/DIGITALOCEAN-DEPLOYMENT.md` for
the remaining operational steps.

The approval-gated lifecycle scripts are also prepared:

```bash
deployment/scripts/preflight.sh
deployment/scripts/backup.sh
DEPLOY_APPROVED=YES deployment/scripts/deploy.sh
deployment/scripts/health-check.sh
ROLLBACK_APPROVED=YES BACKEND_IMAGE=... FRONTEND_IMAGE=... deployment/scripts/rollback.sh
```

Run backups before releases, use immutable image tags, and never roll back
Prisma migrations automatically.
