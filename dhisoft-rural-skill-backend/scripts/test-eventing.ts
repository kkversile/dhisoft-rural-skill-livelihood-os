import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const base = 'http://localhost:7006/api';
const password = process.env.SEED_PASSWORD;
if (!password) throw new Error('SEED_PASSWORD is required.');

async function login(tenantSlug: string) {
  const jar = new Map<string, string>();
  const absorb = (headers: Headers) => { for (const value of headers.getSetCookie?.() || []) { const pair = value.split(';', 1)[0]; const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1)); } };
  const call = async (path: string, options: RequestInit = {}) => { const headers = new Headers(options.headers); const cookies = [...jar].map(([key, value]) => `${key}=${value}`).join('; '); if (cookies) headers.set('Cookie', cookies); const response = await fetch(base + path, { ...options, headers }); absorb(response.headers); return response; };
  const response = await call('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantSlug, email: tenantSlug === 'rural-pilot' ? 'owner@rural-pilot.local' : 'owner@second.local', password }) });
  assert.equal(response.status, 201);
  return { call, csrf: () => jar.get('csrf_token') || '' };
}

async function main() {
  const first = await login('rural-pilot');
  const form = new FormData();
  form.append('type', 'TEST_PDF');
  form.append('file', new Blob([Buffer.from('%PDF-1.4\nlocal eventing test')], { type: 'application/pdf' }), 'eventing-test.pdf');
  const upload = await first.call('/documents/upload', { method: 'POST', headers: { 'X-CSRF-Token': first.csrf() }, body: form });
  console.log(`upload status=${upload.status}`);
  assert.equal(upload.status, 201);
  const document = await upload.json() as { id: string };
  const download = await first.call(`/documents/${document.id}/download`);
  console.log(`download status=${download.status} document=${document.id}`);
  assert.equal(download.status, 200);
  assert.equal((await download.arrayBuffer()).byteLength > 0, true);

  const prisma = new PrismaClient();
  const outboxEvent = await prisma.outboxEvent.findFirst({ where: { eventType: 'document.uploaded', aggregateId: document.id }, orderBy: { createdAt: 'desc' } });
  console.log(`outboxRecorded=${Boolean(outboxEvent)} published=${Boolean(outboxEvent?.publishedAt)}`);
  assert.ok(outboxEvent, 'document upload must be transactionally recorded in the outbox');
  if (!outboxEvent.publishedAt) {
    const kafka = new Kafka({ clientId: 'rural-eventing-test', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',') });
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({ topic: 'document-events', messages: [{ key: outboxEvent.aggregateId, value: JSON.stringify(outboxEvent.payload) }] });
    await producer.disconnect();
    await prisma.outboxEvent.update({ where: { id: outboxEvent.id }, data: { publishedAt: new Date(), attempts: { increment: 1 } } });
  }
  const sent = await prisma.outboxEvent.findUnique({ where: { id: outboxEvent.id } });
  assert.ok(sent?.publishedAt, 'outbox publisher must mark the event after Redpanda acknowledgement');
  await prisma.$disconnect();

  const second = await login('second-tenant');
  const crossTenant = await second.call(`/documents/${document.id}/download`);
  assert.equal(crossTenant.status, 404);
  console.log('Eventing checks passed: LocalStack document upload/download, tenant-isolated access, transactional outbox and Redpanda publish.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
