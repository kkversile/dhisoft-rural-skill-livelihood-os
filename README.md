# DHISOFT Rural Skill and Livelihood OS

DHISOFT connects rural mobilisation, adult candidate registration, counselling, explainable trade recommendations, verified training, practical evidence, certification, apprenticeships, employment, local service work, safety, payments, retention and income outcomes in a tenant-scoped operating system.

## Run locally

1. Install PostgreSQL 15+ and create the requested role/database (the Windows setup helper can initialise a user-owned PostgreSQL 17 cluster when the system administrator password is unavailable).
2. Copy `dhisoft-rural-skill-backend/.env.example` to `.env` and generate local secrets.
3. Copy `dhisoft-rural-skill-frontend/.env.example` to `.env.local`.
4. Run `npm run install:all`, `npm run db:setup`, `npm run db:seed`, then `npm run dev`.

Frontend: http://localhost:7000  
Backend: http://localhost:7006  
Swagger: http://localhost:7006/api/docs  
Health: http://localhost:7006/health

The checked local workspace uses an isolated native PostgreSQL cluster on port `5433` because another Windows PostgreSQL service owns `5432`; its verified credentials are stored only in the ignored backend `.env`.

Local seed login: `owner@rural-pilot.local`; the password is the ignored backend `.env` value in `SEED_PASSWORD`.

For module-by-module navigation, forms, CRUD operations and workflow guidance, see [docs/USER-GUIDE.md](docs/USER-GUIDE.md).

For the executable browser walkthrough, including headless, headed, UI and debug Playwright commands, see [docs/PLAYWRIGHT-GUIDE.md](docs/PLAYWRIGHT-GUIDE.md).
