# Full recording coverage

Recording: [rural-livelihood-full-journey-v2.mp4](./rural-livelihood-full-journey-v2.mp4)
Capture: Chrome, 1280×720, 25 fps, 8:29.20, H.264 MP4
Spec: `tests/full-recording.spec.ts`
Result: passed in isolation; no deployment or database reset was used.

## Visible journey

| Area | Recorded evidence |
| --- | --- |
| Tenant owner | Logs in to `rural-pilot`, reviews every workspace, creates a realistic course titled “Residential Cooling and Refrigeration Foundation”, uploads a private MP4 lesson, then opens assessment, results, certificates, audit and documents. |
| Assessment event flow | Creates `Arjun Kumar <timestamp>`, creates an assessment and a passed result through the real API, then waits for the asynchronous worker window before opening the result/certificate/audit views. The backend certificate-flow test independently verifies completed + passed/failed outbox publication, SQS processing, S3 artifact creation and duplicate idempotency. |
| Programme lead | Counselling, recommendations, courses, batches, attendance and assessments. |
| Coordinator | Candidates, counselling, centres, batches, attendance and assignments. |
| Trainer | Courses, batches, attendance, assignments, assessments and certificates. |
| Assessor | Assessments, assignments, results, certificates and reports. |
| Employer | Employers, vacancies, applications, interviews, offers and placements. |
| Finance | Payments, payouts, earnings and reports. |
| Student | Courses, candidates and assignments; subscribes to the uploaded course and streams its private video for 60 seconds. |
| Second tenant owner | Logs in under `second-tenant` and visits its tenant-scoped candidate, course, document and report workspaces. |

## Workspace routes visited

The owner coverage loop visits every route below and verifies a rendered workspace heading:

`/candidates`, `/counselling`, `/recommendations`, `/trades-and-skills`, `/courses`, `/partners`, `/centres`, `/trainers`, `/batches`, `/attendance`, `/assignments`, `/assessments`, `/certificates`, `/employers`, `/vacancies`, `/applications`, `/interviews`, `/offers`, `/apprenticeships`, `/placements`, `/retention`, `/earnings`, `/service-areas`, `/service-opportunities`, `/service-bookings`, `/complaints`, `/payments`, `/payouts`, `/audit`, and `/documents`.

## Verification outside the MP4

- `node scripts/test-certificate-flow.mjs`: passed; passed and failed assessment events were published, the active certificate and private `CERTIFICATE_ARTIFACT` document were created, and replaying the passed event left one certificate.
- `npm run test:eventing`: passed; private upload/download, tenant isolation, transactional outbox and Redpanda publication.
- `npm run test:infra`: passed; SQS, DLQ, EventBridge, Redis and Redpanda provider checks.
- Redpanda outage recovery: passed; the request committed with a pending outbox row while Redpanda was stopped, then published after restart with `attempts=3`.

The MP4 proves the browser journey and visible business outcomes. It does not claim that browser pixels expose every internal queue acknowledgement; those provider-level claims are backed by the local verification commands above.
