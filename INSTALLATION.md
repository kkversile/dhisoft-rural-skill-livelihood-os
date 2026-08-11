# Installation

## PostgreSQL

The application uses PostgreSQL only. Prefer the database role and database below:

```sql
CREATE ROLE dhisoft_rural_skill_user LOGIN PASSWORD '<generated-local-password>';
CREATE DATABASE dhisoft_rural_skill OWNER dhisoft_rural_skill_user;
```

Set `DATABASE_URL` and `DIRECT_URL` in the ignored backend `.env`, then run:

```bash
npm run install:all
npm run db:setup
npm run db:seed
npm run dev
```

The checked Windows workspace uses PostgreSQL 17 on port `5433` in `storage/postgresql-data` because an existing service owns port `5432`. If `5432` is available, use the port shown in `.env.example` instead. The setup helper verifies connectivity before migrations and never uses schema push as the final database operation.

Redis is optional. Background work has a database-backed fallback; no Docker or global npm package is required.
