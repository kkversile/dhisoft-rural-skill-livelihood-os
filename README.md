# DHISOFT Rural Skill & Livelihood OS

A secure, multi-tenant operating system for rural skilling and livelihood programs, built to connect the full journey from **candidate mobilisation → counselling → training → assessment → certification → apprenticeship → employment → retention → income outcomes**.

This repository is a runnable full-stack Phase 1A implementation rather than a UI-only prototype.

## Product scope

The platform connects multiple operational domains in one tenant-scoped workflow:

- Adult candidate registration and consent
- Identity/eligibility verification
- Counselling
- Explainable trade recommendations
- Candidate trade selection
- Training partners, centres and trainers
- Courses and curriculum
- Batches and enrolment
- Timetables
- Theory and practical attendance
- Assignments and practical evidence
- Evaluation and assessment results
- Certificate verification
- Employer verification
- Vacancies and applications
- Interviews and scorecards
- Offers and joining
- Placements and apprenticeships
- Day-7 / Day-30 retention tracking
- Earnings and income outcomes
- Local service opportunities and bookings
- Complaints and safety workflows
- Payments and idempotent payout records
- Tenant outcome dashboards

## Architecture and security

This project is designed as a real multi-tenant SaaS foundation with explicit isolation and security controls.

Implemented controls include:

- Tenant-scoped data access
- Tenant indexes and foreign-key integrity
- Append-only workflow audit records
- HTTP-only access and refresh cookies
- Rotating refresh-token families
- Refresh-token reuse detection
- Session revocation
- Password reset
- Login lockout
- Argon2 password hashing
- Strict credentialed CORS
- CSRF double-submit validation
- Tenant/session validation
- Cross-tenant read denial verification

## File and evidence handling

The implementation includes tenant-isolated upload keys, random filenames, document versioning, size validation, MIME validation and magic-byte validation for uploaded evidence.

Production object storage, malware scanning and provider credentials remain deployment-specific integrations.

## Frontend experience

The responsive frontend includes:

- List and search views
- Pagination-ready state
- Create forms
- Detail views
- Loading, empty and error states
- Mobile-responsive layouts
- English / Telugu / Hindi language selector
- Web manifest and service worker

## Technology

### Frontend

- Next.js
- React
- TypeScript
- Playwright E2E coverage

### Backend

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- Swagger / OpenAPI

## Engineering verification

The workspace includes commands for:

- Linting
- Type checking
- Backend and frontend tests
- E2E tests
- Headed/UI/debug browser testing
- Production builds
- Workspace verification

The implementation has been checked for Prisma schema validation/generation/migration, database seeding, backend health, Swagger availability, authentication, refresh/CSRF handling, cross-tenant access denial and frontend production build.

## Repository structure

```text
dhisoft-rural-skill-livelihood-os/
├── dhisoft-rural-skill-backend/
├── dhisoft-rural-skill-frontend/
├── docs/
├── scripts/
├── IMPLEMENTATION-STATUS.md
├── PRD-TRACEABILITY-MATRIX.md
└── VERIFICATION-REPORT.md
```

## Run locally

1. Install PostgreSQL 15+.
2. Copy `dhisoft-rural-skill-backend/.env.example` to `.env` and generate local secrets.
3. Copy `dhisoft-rural-skill-frontend/.env.example` to `.env.local`.
4. Run:

```bash
npm run install:all
npm run db:setup
npm run db:seed
npm run dev
```

Local services:

- Frontend: `http://localhost:7000`
- Backend: `http://localhost:7006`
- Swagger: `http://localhost:7006/api/docs`
- Health: `http://localhost:7006/health`

Local seed login: `owner@rural-pilot.local`; the password is read from the ignored backend `.env` value in `SEED_PASSWORD`.

The checked local workspace uses an isolated PostgreSQL cluster on port `5433` because another Windows PostgreSQL service owns `5432`. The setup supports the standard PostgreSQL configuration as well.

## Documentation

- `docs/USER-GUIDE.md` — module-by-module workflows, forms and CRUD guidance
- `docs/PLAYWRIGHT-GUIDE.md` — executable browser walkthrough and E2E commands
- `IMPLEMENTATION-STATUS.md` — implemented capabilities and remaining production integrations
- `PRD-TRACEABILITY-MATRIX.md` — requirements-to-implementation traceability
- `VERIFICATION-REPORT.md` — verification summary

## Remaining production integrations

The data model and local paths are present, but production deployment still requires provider-specific configuration for:

- Email / SMS / WhatsApp
- External payment gateway credentials
- Production object storage
- Redis / BullMQ
- Malware scanning
- Administrative MFA provider/configuration

## What this repository demonstrates

This project demonstrates **multi-tenant SaaS architecture, enterprise workflow modelling, secure authentication/session design, auditability, employment/training lifecycle modelling, multilingual product design and end-to-end verification**.
