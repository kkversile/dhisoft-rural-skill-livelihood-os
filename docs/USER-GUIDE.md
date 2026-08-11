# DHISOFT Rural Skill and Livelihood OS — User Guide

This guide explains how to use the local DHISOFT application, navigate each module, complete forms, and perform the available CRUD operations.

For an executable browser walkthrough of the same navigation, forms, filters, record detail and update flow, see [PLAYWRIGHT-GUIDE.md](PLAYWRIGHT-GUIDE.md).

## 1. Open the system

Start the backend and frontend, then open:

- Frontend: [http://localhost:7000](http://localhost:7000)
- Backend API: [http://localhost:7006/api](http://localhost:7006/api)
- Swagger API documentation: [http://localhost:7006/api/docs](http://localhost:7006/api/docs)
- Health check: [http://localhost:7006/health](http://localhost:7006/health)

Local seeded login:

```text
Tenant slug: rural-pilot
Email: owner@rural-pilot.local
Password: use `SEED_PASSWORD` from the ignored backend `.env`
```

The second seeded tenant is available for isolation testing:

```text
Tenant slug: second-tenant
Email: owner@second.local
Password: use the same `SEED_PASSWORD` value
```

These passwords are for local development only.

For local convenience, the login form reads its prefilled tenant, email and password from `dhisoft-rural-skill-frontend/.env.local` when `NEXT_PUBLIC_ENABLE_LOCAL_LOGIN_PREFILL=true`. The seed password is read from `dhisoft-rural-skill-backend/.env` as `SEED_PASSWORD`; keep the two local values aligned if you change them, then run `npm run db:seed`. Do not enable login prefilling in a shared or production environment because a browser-prefilled password is visible to that browser user.

## 2. Understand the navigation

After login, the left navigation is grouped into five operational areas:

1. **Mobilisation** — register, counsel and recommend trades for candidates.
2. **Training** — configure trades, courses, centres, trainers, batches, attendance, assignments, assessments and certificates.
3. **Employment** — manage employers, vacancies, applications, interviews, offers, apprenticeships, placements, retention and earnings.
4. **Local work & safety** — manage service areas, service opportunities, bookings, complaints, payments and payouts.
5. **Governance** — view outcome reports, audit history and documents.

Every authenticated user works inside the tenant selected at login. Backend queries, forms, reports, audit records and files are tenant-scoped.

## 3. Common list and CRUD behaviour

Most modules use the same workspace pattern.

### Read/list

1. Select a module from the left navigation.
2. The page loads records for the current tenant.
3. Use **Search this workspace** and press **Enter** to search.
4. Use **Refresh** to reload the current list.
5. Select **View** on a row to open the full record detail modal.

The API also supports server-side query controls:

```text
GET /api/workflow/{resource}?page=1&pageSize=20&search=text&status=OPEN&sort=createdAt&direction=desc
```

### Create

1. Open the module.
2. Select **Add ...**.
3. Complete the required fields.
4. Select **Save record**.
5. The new record is shown immediately in the workspace.

Dates are converted to UTC by the frontend. Number fields are sent as numeric values. Fields labelled “comma separated” become arrays.

### Update and status transitions

The backend update endpoint is:

```text
PATCH /api/workflow/{resource}/{id}
```

Example body:

```json
{
  "data": {
    "notes": "Follow-up completed"
  },
  "status": "VERIFIED"
}
```

Use Swagger for authorised update operations when an edit control is not present in the workspace. The request must include the authenticated cookies and CSRF token. The backend checks tenant ownership, references, role permission and audit logging.

### Delete

There is no destructive delete button in the operational UI. Use status transitions such as `INACTIVE`, `CLOSED`, `REJECTED` or `CANCELLED` where supported. This preserves audit history and is safer for livelihood, safety, payment and compliance records.

## 4. Mobilisation modules

### Candidates — `/candidates`

Use this module for adult registration, verification and candidate progression.

#### Create a candidate

Select **Register candidate** and complete:

| Field | Use |
|---|---|
| Full name | Candidate’s legal/display name |
| Date of birth | Used for adult eligibility validation |
| Mobile | Primary contact and duplicate detection value |
| Email | Optional contact |
| Education | Education background |
| District | Operating geography |
| Village | Locality |
| Trade interest | Initial interest used in recommendations |
| Preferred language | `English`, Telugu or Hindi |

The backend rejects underage candidates and duplicate mobile numbers within the tenant. A registration consent record and audit event are created automatically.

#### Verify a candidate

1. Open **Candidates**.
2. Search for the candidate.
3. Select **Verify**.
4. The candidate moves to `VERIFIED` after the tenant-scoped verification request succeeds.

Candidate records include consent, enrolment, applications, placements and income history when those records exist.

### Counselling — `/counselling`

Create a counselling record with:

 - Candidate ID — required.
 - Counsellor ID — required; use the authenticated counsellor or coordinator user ID.
- Session date — required.
- Interests.
- Aptitude.
- Location preference.
- Notes.

Use the record detail view to review the counselling history. Counselling should normally be completed before trade recommendation and candidate trade choice.

### Trade recommendations — `/recommendations`

Recommendations combine candidate trade interests, education, experience, district and published vacancy demand. The result includes a score, factors and explanation.

Generate recommendations through Swagger:

```text
POST /api/workflow/recommendations/generate
```

```json
{
  "candidateId": "candidate-uuid"
}
```

Then return to **Trade recommendations** to review the score and explanation. A recommendation is advisory; a human counsellor should record the final candidate choice.

## 5. Training modules

| Navigation | Route | Create form fields | Main use |
|---|---|---|---|
| Trades and skills | `/trades-and-skills` | Use Swagger for initial trade configuration | Define trade codes, hazard class and active status |
| Courses | `/courses` | Trade ID, course code, title, duration, theory/practical hours, language, status, optional YouTube lesson URL | Udemy-style learning catalog with subscription-gated lesson playback |
| Training partners | `/partners` | Partner name, registration number, status | Maintain approved training organisations |
| Training centres | `/centres` | Centre name, district, capacity, status | Approve centres and capacity |
| Trainers | `/trainers` | Trainer name, phone, specialisations | Maintain trainer capability |
| Batches | `/batches` | Name, course ID, curriculum version ID, centre ID, start date, end date, capacity | Create a training cohort |
| Attendance | `/attendance` | Candidate ID, batch ID, enrolment ID, date, session type, attendance status, reason | Record theory/practical attendance |
| Assignments | `/assignments` | Candidate ID, batch ID, enrolment ID, title, instructions, due date | Assign and track practical work |
| Assessments | `/assessments` | Batch ID, course ID, name, assessment type, scheduled date/time | Schedule theory/practical assessment |
| Certificates | `/certificates` | Review through workspace; create through authorised API workflow | Review issued certificates |

### Recommended training order

1. Create or verify a trade.
2. Create a course and published curriculum version.
3. Create a training partner and approved centre.
4. Create a trainer.
5. Create a batch using the course, curriculum version and centre IDs.
6. Enrol a verified candidate.
7. Record theory and practical attendance.
8. Create practical assignments and evidence/evaluations.
9. Schedule and record assessment results.
10. Issue or review the certificate.

### Course learning catalog

Open **Courses** to use the learning catalog. Each course card shows the course code, language, duration, learning hours and video readiness. Select **View course** to open the learner-style detail view with:

- Course overview and learning-hour summary.
- A starter curriculum preview.
- A lesson panel with subscription status.
- A **Subscribe to course** action when a lesson is available but locked.
- A YouTube player after subscription.

YouTube is the temporary lesson source. Enter a valid `youtube.com`, `youtu.be`, embed or Shorts URL in the course authoring form. The backend validates and converts it to a privacy-enhanced YouTube embed URL. The course record and subscription model are already separated so a later uploaded-video storage adapter can replace YouTube without changing the learner flow.

The local subscription action is intentionally immediate for acceptance testing. A production payment/subscription plan can later connect to the same tenant-scoped subscription record and audit event.

The seeded `ACR-101` acceptance course uses the supplied lesson URL. Its imported lesson metadata is the Telugu title `కార్పెంటర్ టూల్స్  carpentry tools #carpentrytools #tools`, channel `wood work Telugu`, and thumbnail from the lesson. The seeded tenant owner can subscribe and play it using the local credentials in the **Local access** section.

Enrolment creation is restricted to verified candidates and checks batch capacity. Cross-tenant IDs are rejected.

### Public certificate verification

When a certificate has a public verification token, open:

```text
http://localhost:7000/certificates/verify/{token}
```

The public page verifies the credential without exposing the private tenant workspace.

## 6. Employment modules

| Navigation | Route | Create form fields | Main use |
|---|---|---|---|
| Employers | `/employers` | Employer name, district, phone, email | Register and verify employers |
| Vacancies | `/vacancies` | Employer ID, trade ID, title, openings, salary minimum, salary maximum, location, risks and controls | Publish safe vacancies |
| Applications | `/applications` | Use Swagger for application-specific records | Track candidate applications and consent-aware sharing |
| Interviews | `/interviews` | Use Swagger for interview records | Schedule and manage interviews |
| Offers | `/offers` | Use Swagger for offer records | Record offers and acceptance |
| Apprenticeships | `/apprenticeships` | Candidate ID, trade ID, provider, start date, stipend | Track supervised work and stipend |
| Placements | `/placements` | Use Swagger for placement records | Record joining and employment placement |
| Retention | `/retention` | Use Swagger for day-7/day-30 follow-up records | Track continued employment and safety |
| Earnings | `/earnings` | Candidate ID, month, gross income, net income, source | Track verified income outcomes |

### Recommended employment order

1. Verify the employer.
2. Create and publish the vacancy.
3. Confirm candidate consent for employer sharing.
4. Create the application.
5. Record shortlist and interview scorecard.
6. Record the offer and acceptance.
7. Record joining and placement.
8. Complete day-7 and day-30 retention follow-ups.
9. Record income outcomes monthly.

Salary and income values use PostgreSQL decimal money fields. Do not enter personally sensitive identifiers into notes or free-text fields.

## 7. Local work and safety modules

| Navigation | Route | Create form fields | Main use |
|---|---|---|---|
| Service areas | `/service-areas` | Area name, district, postal codes | Define service geography |
| Service opportunities | `/service-opportunities` | Service area ID, trade ID, title, description, price | Create local-service demand |
| Service bookings | `/service-bookings` | Opportunity ID, technician candidate ID, customer name, customer mobile, address, agreed amount | Manage customer work |
| Complaints | `/complaints` | Candidate ID optional, category, description, severity | Record and route safety complaints |
| Payments | `/payments` | Service booking ID or placement ID, amount, provider, provider reference | Record payment events |
| Payouts | `/payouts` | Payment ID, booking ID, candidate ID, amount, idempotency key | Record idempotent technician payouts |

### Safety and complaint procedure

1. Open **Complaints**.
2. Create a record with the correct category, description and severity.
3. Use the record ID for follow-up and audit references.
4. Update status and resolution through an authorised PATCH request.
5. Never put raw government IDs, bank details, passwords or tokens into the description.

### Payment and payout procedure

1. Create or identify the completed service booking.
2. Record the payment with amount, provider and provider reference.
3. Create the payout with a unique idempotency key.
4. Reuse the same idempotency key when retrying a payout operation.
5. Review status and audit history before marking the work complete.

## 8. Governance modules

### Outcome dashboard — `/reports`

Displays tenant-scoped counts and outcome values including candidates, verified candidates, enrolments, certificates, placements, net income, complaints and service bookings.

### Audit history — `/audit`

Use this page to review append-only workflow activity. Audit records include tenant, actor, action, entity, entity ID, before/after values where available and correlation ID.

### Documents — `/documents`

Review tenant-scoped document metadata. Local uploads are stored with random tenant-isolated keys and validated MIME/magic bytes. The upload API is:

```text
POST /api/documents/upload
```

Use the authenticated browser session and CSRF token. Production deployments should configure the S3-compatible adapter and signed access URLs.

## 9. API CRUD reference

The generic workflow resources are:

```text
consents, counselling, recommendations, choices, trades, courses, curricula,
partners, trainers, centres, batches, enrollments, timetables, attendance,
assignments, evidence, evaluations, assessments, results, certificates,
apprenticeships, employers, vacancies, applications, interviews, scorecards,
offers, placements, retention, earnings, serviceAreas, serviceOpportunities,
serviceBookings, complaints, payments, payouts, documents and audit
```

For a resource such as `complaints`:

```text
GET   /api/workflow/complaints
POST  /api/workflow/complaints
GET   /api/workflow/complaints/{id}
PATCH /api/workflow/complaints/{id}
```

Create body:

```json
{
  "data": {
    "category": "SAFETY",
    "description": "Example complaint",
    "severity": "MEDIUM"
  }
}
```

Update body:

```json
{
  "data": {
    "resolution": "Follow-up completed"
  },
  "status": "RESOLVED"
}
```

The backend derives `tenantId` from the authenticated session. Do not send or trust a frontend tenant ID. Reference IDs must belong to the same tenant.

## 10. Language and mobile use

Use the **Language** selector in the top bar to choose English, Telugu or Hindi. Core workflow labels and language fields support the local pilot languages. The application is responsive for mobile screens and includes a service worker/manifest for PWA installation.

## 11. Roles and permissions

The backend recognises platform, tenant, programme, district, field, centre, trainer, assessor, employer, candidate, technician, support, finance, compliance and auditor roles. The frontend navigation is a workspace shell; the backend remains the security boundary.

If an action returns `401`, sign in again or allow the refresh-token flow to complete. If it returns `403`, the current role does not have the required permission. If it returns `404` for a known ID, the record may belong to another tenant or may not exist.

## 12. Test the system

From the repository root:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run verify
```

The Playwright acceptance flow logs in and creates a complaint through the UI:

```text
dhisoft-rural-skill-frontend/tests/login-create.spec.ts
```
