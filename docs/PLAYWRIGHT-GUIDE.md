# DHISOFT Playwright user guide

This is the executable browser guide for the local DHISOFT Rural Skill and Livelihood OS. It logs in as a tenant owner, walks the navigation, opens the forms, checks search and status filters, creates realistic workflow records, opens record detail views, and updates a complaint through the authenticated API.

The suite is intended for local development and acceptance testing. It creates timestamped records in the selected tenant; it is not a read-only test and should not be pointed at production data.

## Prerequisites

Start PostgreSQL, the backend and the frontend first. The backend must answer:

```text
http://localhost:7006/health
```

The browser target is:

```text
http://localhost:7000
```

The seeded local account is:

```text
Tenant slug: rural-pilot
Email: owner@rural-pilot.local
Password: use `SEED_PASSWORD` from the ignored backend `.env`
```

From the repository root, the normal local start command is:

```powershell
npm.cmd run dev
```

If the services are already running, run the tests from the frontend directory or use the root-prefixed commands below.

## Run modes

Headless CI-style run:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend run test:e2e
```

Headed browser run, useful when you want to watch every click:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend run test:e2e:headed
```

Interactive Playwright UI mode:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend run test:e2e:ui
```

Step-through debug mode with the inspector:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend run test:e2e:debug
```

Chrome login/logout coverage for every seeded account:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend run test:e2e:chrome
```

This uses the installed Google Chrome channel and verifies each seeded user can sign in, use the real **Log out** action, return to `/login`, and lose access to the dashboard.

Run only the full module guide:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend exec -- playwright test tests/module-coverage.spec.ts --reporter=line
```

Run that module guide headed:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend exec -- playwright test tests/module-coverage.spec.ts --headed
```

The Playwright config reuses an existing frontend on port 7000. If no frontend is running, it starts the Next.js development server automatically. The backend is intentionally not started by Playwright because database, migration and seed state must be controlled separately.

## What the suite covers

`tests/module-coverage.spec.ts` contains two acceptance flows.

### Navigation, forms and filters

The first test visits every operational workspace and checks:

- The page heading and tenant workspace render.
- The search box exists.
- The status filter can be changed to `OPEN` and returned to all statuses.
- The module’s **Add** button opens and closes its form.

The navigation paths covered are:

```text
/counselling                 /recommendations
/trades-and-skills           /courses
/partners                    /centres
/trainers                    /batches
/attendance                  /assignments
/assessments                 /certificates
/employers                   /vacancies
/applications                /interviews
/offers                      /apprenticeships
/placements                  /retention
/earnings                    /service-areas
/service-opportunities       /service-bookings
/complaints                  /payments
/payouts                     /audit
/documents
```

### Candidate and workflow CRUD journey

The second test creates a unique candidate, then creates records through the visible forms for:

| Module | Form operation exercised |
|---|---|
| Candidates | Registration |
| Courses | Udemy-style catalog, course creation, YouTube URL, metadata rendering, locked lesson, subscribe and iframe playback |
| Counselling | Candidate, counsellor, date and interests |
| Training partners | Name, registration number and status |
| Trainers | Name, phone and specialisations array |
| Training centres | District, capacity and status |
| Batches | Course, curriculum, centre, dates and capacity references |
| Attendance | Candidate, batch, enrolment, date, session and attendance status |
| Practical assignments | Candidate, batch, enrolment, instructions and due date |
| Assessments | Batch, course, type and schedule |
| Apprenticeships | Candidate, trade, provider, date and stipend |
| Employers | Employer identity and district |
| Vacancies | Employer, trade, role, openings, salary, location and safety controls |
| Service areas | District and postal-code array |
| Service opportunities | Area, trade, description and price |
| Service bookings | Opportunity, technician, customer, address and amount |
| Complaints | Category, description and severity |
| Payments | Amount, provider and provider reference |
| Payouts | Amount and idempotency key |
| Earnings | Candidate, month, gross, net and source |

For each created workflow record, the test verifies that it appears in the list and opens the **View / RECORD DETAIL** reader. It then updates the created complaint through `PATCH /api/workflow/complaints/{id}`, verifies the HTTP result, searches for the updated category and applies the status filter.

The workflow API is tenant-scoped and validates referenced IDs. The test therefore obtains IDs from the logged-in tenant rather than inventing foreign-tenant references.

## Other Playwright tests

| File | Coverage |
|---|---|
| `tests/smoke.spec.ts` | Login page smoke check |
| `tests/login-create.spec.ts` | Login and complaint creation smoke flow |
| `tests/auth-all-users.spec.ts` | Google Chrome login/logout coverage for all seeded users and tenants |
| `tests/module-coverage.spec.ts` | Full navigation, form, list, filter, course subscription, detail and update guide |

## Results and failures

After a run, Playwright stores results under `dhisoft-rural-skill-frontend/test-results`. Because the config uses `trace: 'retain-on-failure'`, a failed test includes a trace archive. Open one with:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend exec -- playwright show-trace test-results/<failed-test>/trace.zip
```

For a browsable HTML report:

```powershell
npm.cmd --prefix dhisoft-rural-skill-frontend exec -- playwright show-report
```

When a failure occurs, first check:

```powershell
Invoke-WebRequest http://localhost:7006/health
Invoke-WebRequest http://localhost:7000/login
```

Then confirm the seeded login, tenant slug and PostgreSQL-backed seed data. Do not fix a failed test by removing tenant checks or by using a frontend-provided tenant ID.

## CRUD safety rule

The operational UI deliberately does not expose destructive delete buttons for livelihood, safety, payment, payout, compliance or audit records. The supported lifecycle is create, read, search, filter and authorised status/update transitions. The backend exposes tenant-checked `PATCH` routes for updates, and audit events are appended for changes. Use `CLOSED`, `REJECTED`, `CANCELLED` or another domain status instead of deleting historical records.
