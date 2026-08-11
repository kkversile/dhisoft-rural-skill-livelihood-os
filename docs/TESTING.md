# Testing

From the repository root:

```bash
npm run typecheck
npm test
npm run test:e2e
npm run build
npm run verify
```

The backend checks cover database connectivity, seeded tenant records, authentication, dashboard access, pagination, CSRF enforcement, workflow mutation and cross-tenant denial. The frontend has a Vitest smoke test and Playwright coverage for login plus creating a tenant-scoped complaint through the UI. `npm run verify` checks generated build artifacts; the Windows and Unix verification scripts additionally probe the live health and login endpoints.
