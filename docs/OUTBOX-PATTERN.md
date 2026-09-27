# Transactional outbox

`OutboxEvent` is an additive Prisma model. It stores a complete versioned event envelope and delivery state. `ProcessedEvent` stores `(eventId, consumerName)` receipts for idempotent consumers.

## Write path

Event-producing mutations follow this shape:

```text
BEGIN
  update Candidate / Document / workflow aggregate
  insert AuditEvent
  insert OutboxEvent
COMMIT
```

If PostgreSQL rolls back, no event is visible to the publisher. If a provider is unavailable after commit, the outbox row remains pending.

## Publisher

`OutboxService.publishPending()` claims pending rows, publishes to the configured `StreamPort`, and marks them published only after acknowledgement. Failures increment attempts, retain the error, release the claim and schedule a bounded backoff. A stale claim can be reclaimed after five minutes.

At-least-once delivery is intentional. Exactly-once side effects are achieved by consumer idempotency, not by assuming a network publish is exactly once.

Start the local publisher with:

```bash
npm run workers:dev
```

The publisher does not modify business rows and does not bypass tenant metadata.
