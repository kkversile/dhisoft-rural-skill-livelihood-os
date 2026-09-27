# Failure and recovery tests

These tests are local-only and must not target production or DigitalOcean. They validate that PostgreSQL state is not lost when a downstream provider is unavailable and that retries do not duplicate side effects.

## Scenarios

1. Stop Redpanda, create a candidate, and verify the request commits while its `OutboxEvent.publishedAt` remains null. Start Redpanda, run the publisher, and verify the event is published and marked published.
2. Stop LocalStack, upload a document with `STORAGE_PROVIDER=localstack`, and verify the API returns a controlled storage error without a document row. Restore LocalStack and retry.
3. Send a certificate message whose `idempotencyKey` has already been processed. Verify the consumer creates one side effect and skips the duplicate.
4. Force a queue consumer failure. Verify the message is retried and eventually appears in the matching DLQ after the configured receive count.
5. Publish the same event twice. Verify `ProcessedEvent` has one row per `(eventId, consumerName)` and the handler runs once.
6. Check `/health/live` while dependencies are down; it must stay live. Check `/health/ready`; it must report the failed dependency without secrets and return HTTP 503.

## Evidence to record

Record the command, timestamp, provider mode, event ID/message ID, HTTP result, outbox attempts, published timestamp, processed-event count and DLQ message count. The final verification report must distinguish passed, not run and blocked scenarios; do not claim recovery success without observed output.

## Observed local results (2026-09-27)

- Redpanda recovery: passed in the existing local recovery run. With Redpanda stopped, candidate registration returned `201` and left a pending outbox row; after restart, the compiled outbox worker published it.
- LocalStack/Redis/Redpanda integration: passed through `npm run test:infra` for SQS publish/consume, DLQ redrive, EventBridge publish, Redis round-trip and Redpanda producer/consumer.
- LocalStack document flow: passed through `npm run test:eventing` for private object upload/download, tenant-isolated download denial, transactional outbox insertion and stream publication.
- Assessment certificate flow: passed through `node scripts/test-certificate-flow.mjs`; both completed and pass/fail events were published, the certificate row and private artifact were created, and replaying the passed envelope left one active certificate.
- Queue failure/DLQ and LocalStack outage upload scenario: not run as end-to-end application scenarios in this pass. The generic queue/DLQ contract is covered by `npm run test:infra`; no claim is made for the unrun application outage scenario.
- Health liveness/readiness dependency failure: not run in this pass.
