# Deployment

The application is split into a Next.js frontend and NestJS backend. Local ports are fixed at frontend `7000`, backend `7006`, Swagger `/api/docs`, and health `/health`.

Use PostgreSQL only. Apply migrations with `npm run db:migrate`, generate the Prisma client with `npm --prefix dhisoft-rural-skill-backend run db:generate`, and seed only non-production environments. Set a strict `FRONTEND_URL`; credentialed CORS must never use `*`.

For production, provide rotated JWT/encryption/CSRF secrets, a managed PostgreSQL connection, S3-compatible storage, an email/SMS provider, Redis/BullMQ if desired, a malware scanner, and an operational MFA provider. Do not commit `.env` files or seed passwords.
