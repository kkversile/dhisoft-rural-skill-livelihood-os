# Local infrastructure

The repository supports two local modes:

1. The existing lightweight mode uses the local filesystem, PostgreSQL, and in-process memory adapters.
2. The AWS-compatible mode uses Docker Compose for PostgreSQL, LocalStack (S3/SQS/EventBridge), Redpanda and Redis.

No DigitalOcean or real AWS account is used by either mode.

## Prerequisites

- Node.js 20+
- npm
- Docker Desktop with Compose v2
- PostgreSQL is supplied by the local Compose stack, or an existing PostgreSQL 15+ instance may be used.

Install application dependencies:

```bash
npm run install:all
```

## AWS-compatible local startup

Start the bounded local services:

```bash
npm run infra:start
```

For the Compose database, use these local-only backend settings in the ignored `dhisoft-rural-skill-backend/.env`:

```dotenv
DATABASE_URL=postgresql://dhisoft_rural_skill:local-only-password@localhost:5434/dhisoft_rural_skill?schema=public
DIRECT_URL=postgresql://dhisoft_rural_skill:local-only-password@localhost:5434/dhisoft_rural_skill?schema=public
STORAGE_PROVIDER=localstack
STORAGE_DRIVER=localstack
S3_ENDPOINT=http://127.0.0.1:4567
S3_REGION=ap-south-1
S3_BUCKET=rural-private
S3_ACCESS_KEY=test
S3_SECRET_KEY=test
AWS_ENDPOINT_URL=http://127.0.0.1:4567
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
QUEUE_PROVIDER=localstack
EVENTBUS_PROVIDER=eventbridge
EVENTBUS_NAME=rural-events
STREAM_PROVIDER=redpanda
KAFKA_BROKERS=127.0.0.1:19092
CACHE_PROVIDER=redis
REDIS_URL=redis://127.0.0.1:6379
```

Initialize resources; this command is safe to rerun:

```bash
npm run infra:init
npm run db:migrate
npm run db:seed
```

Start the applications and outbox publisher in separate terminals:

```bash
npm run dev
npm run workers:dev
npm run workers:events
npm run workers:certificate
```

The frontend is at `http://localhost:7000`, the backend at `http://localhost:7006`, Swagger at `http://localhost:7006/api/docs`, and health endpoints are `/health/live` and `/health/ready`.

## Ports and local credentials

| Service | Host port | Local-only credentials |
| --- | ---: | --- |
| PostgreSQL | 5434 | `dhisoft_rural_skill` / `local-only-password` |
| LocalStack | 4567 | `test` / `test` |
| Redpanda Kafka API | 19092 | none |
| Redis | 6379 | none |
| Backend | 7006 | application session |
| Frontend | 7000 | application session |

The S3 bucket is private. The backend remains the authorization boundary for uploads and downloads.

## Lightweight mode

To preserve the original local workflow, set `STORAGE_PROVIDER=local`, `QUEUE_PROVIDER=memory`, `EVENTBUS_PROVIDER=memory`, `STREAM_PROVIDER=memory`, and `CACHE_PROVIDER=noop`. PostgreSQL is still required. Existing local filesystem uploads remain under `LOCAL_STORAGE_PATH`.

## Shutdown and troubleshooting

Check or stop infrastructure without removing persistent volumes:

```bash
npm run infra:status
npm run infra:stop
```

`infra:start` waits for the loopback ports before returning. Host port `4567` maps to LocalStack's container API port `4566`; use `AWS_ENDPOINT_URL=http://127.0.0.1:4567` from the host and `http://localstack:4566` only from another Compose container.

Use `docker compose -f infra/docker-compose.local.yml ps` and `docker compose -f infra/docker-compose.local.yml logs <service>` to inspect services. If readiness reports `localstack` or `redpanda` down, start Compose and rerun `npm run infra:init`. If PostgreSQL is already occupied, use a different host port and update `DATABASE_URL`/`DIRECT_URL`; never reset an existing database.
