# Queue catalogue

SQS-compatible queues are for retryable work, not durable domain history. Each queue has a matching DLQ and carries a versioned message with tenant and correlation metadata.

| Queue | DLQ | Work | Retry policy |
| --- | --- | --- | --- |
| `rural-document-processing` | `rural-document-processing-dlq` | post-upload validation/enrichment | visibility 30s, max 5 receives |
| `rural-certificate-generation` | `rural-certificate-generation-dlq` | certificate artifact generation | visibility 30s, max 5 receives |
| `rural-notification` | `rural-notification-dlq` | email/SMS/WhatsApp delivery | visibility 30s, max 5 receives |
| `rural-report-generation` | `rural-report-generation-dlq` | asynchronous report creation | visibility 30s, max 5 receives |

Message shape:

```json
{
  "messageId": "uuid",
  "messageVersion": 1,
  "tenantId": "uuid",
  "correlationId": "uuid",
  "idempotencyKey": "certificate:aggregate-id",
  "data": { "aggregateId": "uuid" }
}
```

`npm run infra:init` creates the bucket, queues, DLQs and EventBridge bus idempotently in LocalStack.

Start the outbox publisher, stream consumers and certificate queue worker in separate terminals:

```bash
npm run workers:dev
npm run workers:events
npm run workers:certificate
```
