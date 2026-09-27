# Event-driven architecture

This document describes the locally verified architecture as audited on 2026-09-27. It separates implemented behavior from the production target. Nothing in the production target has been deployed from this workspace.

## Current architecture

The repository is a two-application modular monolith with provider-backed workers:

```text
Next.js App Router frontend :7000
        |
        | credentialed REST calls, CSRF header, HTTP-only cookies
        v
NestJS REST backend :7006
        |
        +-- AuthModule / session and tenant validation
        +-- CandidatesModule
        +-- WorkflowModule (generic CRUD for most domains)
        +-- StorageModule (local filesystem upload adapter)
        +-- Dashboard and certificate controllers
        |
        v
PostgreSQL via Prisma
        |
        +-- transactional outbox -> Redpanda domain topics
        +-- selected integration events -> EventBridge
        +-- SQS certificate work queue -> certificate worker -> private S3
```

The frontend has one route per operational workspace and a shared workflow-page component for most CRUD pages. The backend exposes `/api/auth`, `/api/candidates`, `/api/workflow/*`, `/api/dashboard`, `/api/documents/upload`, `/api/certificates/verify/*`, and `/health`.

### Major modules and bounded-context candidates

| Current code area | Bounded-context candidate | Current ownership |
| --- | --- | --- |
| `src/auth`, tenant and session models | Identity / Tenant | Authentication, sessions, refresh-token families, permissions and tenant status |
| `src/candidates` and candidate workflow resources | Candidate | Registration, adult eligibility, consent, verification, counselling and recommendations |
| training resources in `WorkflowService` | Training | Partners, centres, trainers, courses, batches, attendance, assignments, assessments and certificates |
| employer and placement resources in `WorkflowService` | Employment / Placement | Employers, vacancies, applications, interviews, offers, apprenticeships, placements and retention |
| service and money resources in `WorkflowService` | Livelihood | Service areas, opportunities, bookings, complaints, payments, payouts and income |
| `src/events` and workers | Notification / Integration | Event consumers, EventBridge forwarding and certificate processing |
| `DashboardController` and report query | Analytics | Current synchronous tenant-scoped counts and income aggregation |
| `AuditEvent` writes in services | Audit | Current append-only database records; no event stream or outbox yet |

### Synchronous dependencies currently present

- `AuthGuard` reads the authenticated session from PostgreSQL on every protected request and updates `lastSeenAt`.
- `AuthService` performs login, refresh rotation, lockout, password reset, session revocation and audit writes synchronously in PostgreSQL.
- `CandidatesService.create` uses one Prisma transaction for the candidate, registration consent and audit record.
- `WorkflowService` performs generic model CRUD, same-tenant reference checks, audit writes and course YouTube oEmbed metadata lookup. The oEmbed call is an external synchronous HTTP call during course create/update.
- `StorageService` validates upload bytes and writes to the local filesystem before inserting `Document` metadata.
- Dashboard reads are tenant-scoped and cached in Redis for 45 seconds; PostgreSQL remains the source of truth and is used when Redis is unavailable.
- State-changing workflow mutations enqueue their domain events in the same Prisma transaction as the business write.
- The outbox worker publishes to Redpanda and forwards only the documented integration events to EventBridge.
- The certificate path uses assessment result events, SQS retry/DLQ semantics, an idempotent certificate worker and private S3-compatible storage.

### Storage path

The current default is `STORAGE_DRIVER=local` with `LOCAL_STORAGE_PATH=./storage`. The verified AWS-compatible mode uses private S3-compatible storage through LocalStack locally and S3/Spaces in a production deployment. Uploaded files use tenant-scoped keys, and backend authorization remains required for downloads.

### Background processing

The repository includes separate outbox, event-consumer and certificate worker entry points. The frontend service worker is still only a PWA asset, not a business-job queue.

### Event and audit implementation

`AuditEvent` remains the synchronous request audit mechanism. Domain events use a versioned envelope, `OutboxEvent` rows, Redpanda topics and consumer groups. `ProcessedEvent` provides consumer idempotency. The dashboard cache invalidation consumer clears the tenant dashboard key after relevant workflow events.

### PostgreSQL usage

PostgreSQL, accessed through Prisma, is the system of record for identity, tenant data, workflow entities, documents, audit records, sessions, refresh tokens and course subscriptions. The existing migrations must remain immutable. New eventing tables are added through a new migration and do not replace existing models or reset the database.

### Security and tenant isolation

The authenticated tenant comes from the validated access-token/session pair, not from request body data. Protected controllers use `AuthGuard`; candidate and generic workflow routes also use `PermissionGuard`. Queries include `tenantId`, workflow reference IDs are checked against the same tenant, and storage keys include the tenant ID. The target adapters and workers must carry tenant ID in envelopes/messages and repeat these boundaries at every consumer.

## Target architecture

The first target is still one deployable repository and one PostgreSQL system of record. Infrastructure is introduced behind ports so the same domain code can run with local fallbacks, LocalStack and later AWS-compatible providers.

```text
HTTP API / existing frontend
          |
          v
NestJS domain modules and application services
          |
          +-- StoragePort  -> local filesystem | LocalStack S3 | S3 | Spaces
          +-- QueuePort    -> local adapter     | LocalStack SQS
          +-- EventBusPort -> local adapter     | LocalStack EventBridge
          +-- StreamPort   -> local adapter     | Redpanda/Kafka | Kinesis later
          +-- CachePort    -> no-op/local        | Redis
          |
          +-- PostgreSQL transaction
                  +-- business state
                  +-- outbox_events
                              |
                              v
                  outbox publisher -> StreamPort
                              |
             +----------------+----------------+
             v                v                v
        audit consumer   analytics consumer  notification consumer
                              |
                         certificate worker -> QueuePort -> S3/StoragePort
```

Redpanda/Kafka is the durable domain-event stream and replay boundary. SQS is for work that should be retried and eventually sent to a DLQ. EventBridge is reserved for selected integration/business events and is not a duplicate of every stream event. PostgreSQL remains authoritative; Redis is only a bounded cache/coordination layer.

## Migration strategy

1. Add typed ports, provider selection and local/no-op adapters without changing public API behavior.
2. Add local infrastructure Compose configuration and idempotent resource initialization. Keep local filesystem storage as the default fallback.
3. Route the existing storage service through `StoragePort`; add tenant-scoped S3 keys and private backend-mediated access.
4. Add `outbox_events` and a reusable event envelope. Migrate mutations one bounded context at a time so state change and outbox insert share a Prisma transaction.
5. Add stream and queue publishers/workers inside this repository. Consumers must be idempotent and tenant-aware.
6. Add Redis only for explicit cache/rate-limit/coordination cases. Never move core business state from PostgreSQL.
7. Add EventBridge-compatible integration for a small, documented set of integration events.
8. Add readiness checks, structured correlation-aware logs, local failure tests and resource limits.
9. Prepare, but do not execute, DigitalOcean deployment files after local verification is stable.
10. Extract separately deployable services only after contracts, consumers and operational boundaries have been proven in-process.

## Event envelope

All published domain events use a versioned envelope:

```json
{
  "eventId": "uuid",
  "eventType": "candidate.registered",
  "eventVersion": 1,
  "occurredAt": "2026-09-26T00:00:00.000Z",
  "tenantId": "tenant-uuid",
  "aggregateType": "Candidate",
  "aggregateId": "candidate-uuid",
  "correlationId": "request-or-workflow-uuid",
  "causationId": null,
  "data": {}
}
```

Payloads contain identifiers and the minimum data needed by a consumer. Secrets, raw credentials, government identifiers and unnecessary personal data are not placed in queues or streams.

## Event catalogue

Initial domain event names are grouped by bounded context. They are contracts, not claims that every event is already emitted.

| Context | Events |
| --- | --- |
| Candidate | `candidate.registered`, `candidate.verified`, `counselling.completed`, `candidate.trade.selected` |
| Training | `training.enrolled`, `training.attendance.recorded`, `training.assessment.completed`, `training.assessment.passed`, `training.certificate.issued` |
| Employment | `employment.application.created`, `employment.interview.completed`, `employment.offer.created`, `employment.placement.created`, `employment.retention.updated` |
| Livelihood | `livelihood.booking.created`, `livelihood.earning.recorded`, `livelihood.payout.completed` |
| Audit / integration | `audit.recorded`, selected integration events such as `certificate.issued`, `placement.completed`, `retention.milestone.reached`, `payout.completed` |

## Queue catalogue

Work queues are distinct from the domain stream:

| Queue | Intended work | DLQ |
| --- | --- | --- |
| `rural-document-processing` | validate/enrich evidence after upload | `rural-document-processing-dlq` |
| `rural-certificate-generation` | generate certificate artifacts after a passed assessment | `rural-certificate-generation-dlq` |
| `rural-notification` | deliver notification requests | `rural-notification-dlq` |
| `rural-report-generation` | produce asynchronous reports | `rural-report-generation-dlq` |

Each message carries a message version, event/message ID, tenant ID, correlation ID and idempotency key. Retry and visibility settings remain conservative for the 16 GB target host.

## Transactional outbox

For an event-producing state transition, the business write and the `outbox_events` insert occur inside the same PostgreSQL transaction. The publisher claims unpublished rows, publishes the envelope, and marks the row published only after a successful provider acknowledgement. Retries may publish a duplicate; consumers must therefore use an idempotency key or event ID to make side effects safe. Retention and cleanup are based on published timestamp and an explicit operational retention window.

## Service boundaries

The monorepo boundaries are:

- Identity Service: users, tenants, sessions, tokens and authorization contracts.
- Candidate Service: candidate lifecycle, consent, counselling and recommendation contracts.
- Training Service: training delivery, assessment and certificate contracts.
- Employment Service: employer demand, applications, placement and retention contracts.
- Livelihood Service: local work, bookings, complaints, money and income contracts.
- Notification/Integration Worker: consumes events and sends external notifications/integrations.
- Analytics/Audit Workers: consume events and build read/audit projections without becoming the system of record.

Until extraction is proven safe, these remain Nest modules/workers in this repository and may share Prisma through explicit application services. New cross-boundary behavior should use DTOs and events rather than direct manipulation of another domain's tables.

## Local deployment topology

The local stack is intentionally optional and bounded:

```text
Frontend :7000 -> Backend :7006 -> PostgreSQL :5433 (or configured port)
                          |
                          +-> LocalStack :4567 host -> :4566 container (S3/SQS/DLQ/EventBridge)
                          +-> Redpanda :19092 (Kafka API)
                          +-> Redis :6379 (bounded cache/coordination)
```

All infrastructure ports should bind to loopback for local development. LocalStack resources are private and created by an idempotent initializer. Production preparation will place infrastructure on an internal network and expose only Nginx/HTTP/HTTPS; it is not executed by this task.

## Resource and operational constraints

The eventual DigitalOcean host has approximately 15 GiB RAM and 4 GiB swap, but it is out of scope for this local implementation. Local Compose limits should target roughly 1 GB Redpanda, 1–1.5 GB LocalStack, 1–1.5 GB PostgreSQL, 256 MB Redis, and bounded worker/backend/frontend processes. Health endpoints must not expose secrets and must distinguish liveness from readiness.
