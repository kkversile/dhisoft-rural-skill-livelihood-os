import 'dotenv/config';
import assert from 'node:assert/strict';

const base = 'http://localhost:7006/api';
const loginPassword = process.env.SEED_PASSWORD;
if (!loginPassword) throw new Error('SEED_PASSWORD must be set before running backend E2E checks.');

const jar = new Map();

function absorb(headers) {
  for (const value of headers.getSetCookie?.() || []) {
    const pair = value.split(';', 1)[0];
    const at = pair.indexOf('=');
    jar.set(pair.slice(0, at), pair.slice(at + 1));
  }
}

function cookieHeader() {
  return [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
}

async function call(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  const cookies = cookieHeader();
  if (cookies) headers.set('Cookie', cookies);
  const response = await fetch(base + path, { ...options, headers });
  absorb(response.headers);
  let body = null;
  try { body = await response.json(); } catch {}
  return { response, body };
}

const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ tenantSlug: 'rural-pilot', email: 'owner@rural-pilot.local', password: loginPassword }) });
assert.equal(login.response.status, 201);
const csrf = jar.get('csrf_token');
assert.ok(csrf);
const dashboard = await call('/dashboard');
assert.equal(dashboard.response.status, 200);
const candidates = await call('/candidates?pageSize=1');
assert.equal(candidates.response.status, 200);
const candidateId = candidates.body.data[0].id;
const noCsrf = await call('/workflow/complaints', { method: 'POST', body: JSON.stringify({ data: { category: 'TEST', description: 'csrf check', severity: 'LOW' } }) });
assert.equal(noCsrf.response.status, 401);
const complaint = await call('/workflow/complaints', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { category: 'TEST', description: 'automated verification', severity: 'LOW' } }) });
assert.equal(complaint.response.status, 201);
const second = new Map(jar);
jar.clear();
const secondLogin = await call('/auth/login', { method: 'POST', body: JSON.stringify({ tenantSlug: 'second-tenant', email: 'owner@second.local', password: loginPassword }) });
assert.equal(secondLogin.response.status, 201);
const cross = await call(`/candidates/${candidateId}`);
assert.equal(cross.response.status, 404);
jar.clear();
for (const [key, value] of second) jar.set(key, value);
console.log('E2E checks passed: login, dashboard, pagination, CSRF, workflow mutation and cross-tenant denial.');
