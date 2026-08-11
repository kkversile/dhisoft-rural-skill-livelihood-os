# PRD traceability matrix

| PRD area | Status | Evidence |
|---|---|---|
| Ports and application split | Implemented | Next/Nest scripts, environment examples and Playwright config |
| PostgreSQL, UUID, Decimal, migrations | Implemented | `prisma/schema.prisma`, complete migration and seed |
| Tenant isolation | Implemented for tenant scope | Authenticated tenant derivation, scoped workflow queries, storage keys and cross-tenant E2E denial |
| Authentication and session security | Implemented for local flow | Argon2, access/rotating refresh cookies, reuse detection, lockout, reset, revocation and CSRF |
| Roles and backend permissions | Implemented baseline | Role catalogue, permission map and `PermissionGuard` on candidate/workflow APIs |
| Candidate registration, verification and consent | Implemented | Candidate DTO/service/controller, registration consent, audit and responsive UI |
| Counselling and recommendations | Implemented | Counselling/recommendation models, explainable scoring service and pages |
| Training and practical verification | Implemented domain slice | Partner, centre, trainer, batch, enrolment, timetable, attendance, assignment, evidence and evaluation routes |
| Assessment and certification | Implemented domain slice | Assessment/result/certificate models and public verification endpoint/page |
| Employment and apprenticeship | Implemented domain slice | Employer, vacancy, application, interview, scorecard, offer, placement and apprenticeship routes |
| Local service, complaints and money flows | Implemented domain slice | Service, complaint, payment and payout models/routes with tenant scoping |
| Retention, earnings and reporting | Implemented | Follow-ups, income records, report endpoint and dashboard |
| Storage | Implemented locally | Tenant-isolated filesystem upload with random names, size/MIME/magic-byte validation and document metadata |
| Localisation and PWA | Implemented baseline | English/Telugu/Hindi selector, manifest and service worker |
| Automated verification | Implemented | Typecheck, Vitest, backend checks, backend E2E, Playwright and production builds |
| External production providers | Configuration required | Email/SMS/WhatsApp, S3, payment gateway, Redis/BullMQ, malware scanning and enterprise MFA credentials |
