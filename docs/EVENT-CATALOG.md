# Event catalogue

Events are versioned contracts carried by the transactional outbox and published to a domain topic. Candidate, document and generic workflow mutations are emitted today. Assessment results additionally emit a completed event and exactly one pass/fail event. The certificate worker emits `training.certificate.issued` after its idempotent SQS/S3 side effect.

| Event | Aggregate | Topic | Initial consumers |
| --- | --- | --- | --- |
| `candidate.registered` | Candidate | `candidate-events` | audit, analytics, notification |
| `candidate.verified` | Candidate | `candidate-events` | audit, analytics |
| `counselling.completed` | CounsellingSession | `candidate-events` | audit, analytics |
| `candidate.trade.selected` | CandidateTradeChoice | `candidate-events` | audit, analytics |
| `training.enrolled` | Enrollment | `training-events` | audit, analytics |
| `training.attendance.recorded` | AttendanceRecord | `training-events` | audit, analytics |
| `training.assessment.completed` | Assessment | `training-events` | audit, analytics |
| `training.assessment.passed` | AssessmentResult | `training-events` | certificate, audit, analytics |
| `training.assessment.failed` | AssessmentResult | `training-events` | audit, analytics, dashboard-cache-invalidation |
| `training.certificate.issued` | Certificate | `training-events` | audit, analytics, integration |
| `employment.application.created` | JobApplication | `employment-events` | audit, analytics |
| `employment.interview.completed` | Interview | `employment-events` | audit, analytics |
| `employment.offer.created` | EmploymentOffer | `employment-events` | audit, analytics |
| `employment.placement.created` | Placement | `employment-events` | audit, analytics, integration |
| `employment.retention.updated` | RetentionFollowUp | `employment-events` | audit, analytics, integration |
| `livelihood.booking.created` | ServiceBooking | `livelihood-events` | audit, analytics, notification |
| `livelihood.earning.recorded` | IncomeRecord | `livelihood-events` | audit, analytics |
| `livelihood.payout.completed` | Payout | `livelihood-events` | audit, analytics, integration |
| `document.uploaded` | Document | `document-events` | document processor, audit |

The outbox worker also forwards these integration events to EventBridge: `training.certificate.issued`, `employment.placement.created`, `employment.retention.updated`, and `livelihood.payout.completed`. It does not duplicate every stream event to EventBridge.

## Envelope

```json
{
  "eventId": "uuid",
  "eventType": "candidate.registered",
  "eventVersion": 1,
  "occurredAt": "2026-09-26T00:00:00.000Z",
  "tenantId": "uuid",
  "aggregateType": "Candidate",
  "aggregateId": "uuid",
  "correlationId": "uuid",
  "causationId": null,
  "data": { "candidateId": "uuid", "status": "SUBMITTED" }
}
```

Consumers must treat `eventId` as a duplicate-detection key, preserve `tenantId`, and avoid placing secrets or unnecessary personal data in `data`.
