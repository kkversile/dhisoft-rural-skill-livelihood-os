# PRD traceability matrix

| PRD area | Implementation evidence |
|---|---|
| Frontend/backend and mandatory ports | Next.js scripts/config, Nest `main.ts`, environment examples, Playwright config |
| PostgreSQL, UUID, Decimal and migration | `dhisoft-rural-skill-backend/prisma/schema.prisma`, `prisma/migrations/20260804190024_complete_domain` |
| Tenant isolation | `AuthGuard`, every workflow query/create/update with authenticated `tenantId`, cross-tenant API verification |
| Authentication and session security | `src/auth/auth.service.ts`, `auth.guard.ts`, rotating `RefreshToken`, `AuthSession`, CSRF and reset flows |
| Candidate pipeline and consent | `src/candidates`, `Candidate`, `Consent`, candidate UI, seed and audit events |
| Counselling and recommendation | `CounsellingSession`, `TradeRecommendation`, `WorkflowService.recommend`, `/counselling`, `/recommendations` |
| Training and practical verification | `TrainingPartner`, `TrainingCentre`, `TrainerProfile`, `Batch`, `Enrollment`, attendance, assignment, evidence and evaluation models/routes |
| Assessment, certification and public verification | `Assessment`, `AssessmentResult`, `Certificate`, `/api/certificates/verify/:token`, public Next route |
| Employment and apprenticeship | employer/vacancy/application/interview/offer/placement/apprenticeship models and workflow UI/API |
| Local service work, safety and complaints | service area/opportunity/booking, complaint, payment and payout models and workspaces |
| Retention, earnings and reporting | follow-up/income models, `/api/workflow/report`, dashboard and earnings/retention workspaces |
| Storage | `src/storage`, tenant-isolated local upload, random key, MIME/magic-byte/size checks and document audit metadata |
| Localisation and PWA | language selector, core Telugu labels, manifest, `public/sw.js`, registration component |
| Verification | strict TypeScript, Prisma validate/generate/migrate/seed, backend health/auth/isolation checks, Next production build |
