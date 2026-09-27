import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const base = 'http://localhost:7006/api';
const password = process.env.SEED_PASSWORD;
if (!password) throw new Error('SEED_PASSWORD is required.');
const jar = new Map();
function absorb(headers) { for (const value of headers.getSetCookie?.() || []) { const pair = value.split(';', 1)[0]; const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1)); } }
async function call(path, options = {}) { const headers = new Headers(options.headers); const cookies = [...jar].map(([key, value]) => `${key}=${value}`).join('; '); if (cookies) headers.set('Cookie', cookies); const response = await fetch(base + path, { ...options, headers }); absorb(response.headers); return response; }
const login = await call('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug: 'rural-pilot', email: 'owner@rural-pilot.local', password }) });
assert.equal(login.status, 201);
const csrf = jar.get('csrf_token');
const stamp = Date.now().toString();
const candidate = await call('/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf }, body: JSON.stringify({ fullName: `Failure Recovery ${stamp}`, dateOfBirth: '1992-01-01', mobile: `910${stamp.slice(-7)}`, preferredLanguage: 'en', tradeInterests: ['carpentry'], district: 'Rangareddy' }) });
assert.equal(candidate.status, 201);
const created = await candidate.json();
const prisma = new PrismaClient();
const outbox = await prisma.outboxEvent.findFirst({ where: { eventType: 'candidate.registered', aggregateId: created.id }, orderBy: { createdAt: 'desc' } });
assert.ok(outbox && !outbox.publishedAt, 'candidate transaction should leave a pending outbox row when Redpanda is unavailable');
console.log(JSON.stringify({ candidateId: created.id, outboxId: outbox.id, publishedAt: outbox.publishedAt }));
await prisma.$disconnect();
