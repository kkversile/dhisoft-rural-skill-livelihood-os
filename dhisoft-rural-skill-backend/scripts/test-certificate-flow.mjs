import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { Kafka } from 'kafkajs';

const base = process.env.TEST_API_BASE || 'http://localhost:7006/api';
const password = process.env.SEED_PASSWORD || process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || 'LocalOnlyPass123!';
const prisma = new PrismaClient();
const jar = new Map();

function absorb(headers) { for (const value of headers.getSetCookie?.() || []) { const pair = value.split(';', 1)[0]; const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1)); } }
function cookies() { return [...jar].map(([key, value]) => `${key}=${value}`).join('; '); }
async function call(path, options = {}) {
  const headers = new Headers(options.headers); headers.set('Content-Type', 'application/json'); const cookie = cookies(); if (cookie) headers.set('Cookie', cookie);
  const response = await fetch(base + path, { ...options, headers }); absorb(response.headers); let body = null; try { body = await response.json(); } catch {} return { response, body };
}
async function waitFor(label, check, timeoutMs = 45_000) { const started = Date.now(); while (Date.now() - started < timeoutMs) { const value = await check(); if (value) return value; await new Promise((resolve) => setTimeout(resolve, 1000)); } throw new Error(`Timed out waiting for ${label}`); }

try {
  const login = await call('/auth/login', { method: 'POST', body: JSON.stringify({ tenantSlug: 'rural-pilot', email: 'owner@rural-pilot.local', password }) });
  assert.equal(login.response.status, 201, `login failed: ${login.response.status}`);
  const csrf = jar.get('csrf_token'); assert.ok(csrf, 'CSRF cookie missing');
  const [candidateList, courseList, batchList, curriculumList] = await Promise.all([
    call('/candidates?pageSize=2'), call('/workflow/courses'), call('/workflow/batches'), call('/workflow/curricula'),
  ]);
  for (const [name, result] of [['candidates', candidateList], ['courses', courseList], ['batches', batchList], ['curricula', curriculumList]]) assert.equal(result.response.status, 200, `${name} list failed: ${result.response.status} ${JSON.stringify(result.body)}`);
  const candidateA = candidateList.body.data[0]; const candidateB = candidateList.body.data[1]; const course = courseList.body.data[0]; const batch = batchList.body.data[0]; const curriculum = curriculumList.body.data[0];
  assert.ok(candidateA && candidateB && course && batch && curriculum, 'seeded training references are required');
  const assessment = await call('/workflow/assessments', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { batchId: batch.id, courseId: course.id, name: `Residential Cooling Foundation Assessment ${Date.now()}`, assessmentType: 'THEORY', scheduledAt: new Date().toISOString() } }) });
  assert.equal(assessment.response.status, 201, `assessment creation failed: ${assessment.response.status}`);
  const passed = await call('/workflow/results', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { assessmentId: assessment.body.id, candidateId: candidateA.id, theoryScore: 86, practicalScore: 91, totalScore: 88.5, passed: true } }) });
  assert.equal(passed.response.status, 201, `passed result failed: ${passed.response.status}`);
  const failed = await call('/workflow/results', { method: 'POST', headers: { 'X-CSRF-Token': csrf }, body: JSON.stringify({ data: { assessmentId: assessment.body.id, candidateId: candidateB.id, theoryScore: 42, practicalScore: 39, totalScore: 40.5, passed: false } }) });
  assert.equal(failed.response.status, 201, `failed result failed: ${failed.response.status}`);
  const passedId = passed.body.id; const failedId = failed.body.id;
  const passedEvents = await waitFor('passed and completed outbox publication', async () => { const rows = await prisma.outboxEvent.findMany({ where: { aggregateId: passedId }, select: { eventType: true, publishedAt: true } }); return rows.length >= 2 && rows.every((row) => row.publishedAt) ? rows : null; });
  const failedEvents = await waitFor('failed and completed outbox publication', async () => { const rows = await prisma.outboxEvent.findMany({ where: { aggregateId: failedId }, select: { eventType: true, publishedAt: true } }); return rows.length >= 2 && rows.every((row) => row.publishedAt) ? rows : null; });
  assert.ok(passedEvents.some((row) => row.eventType === 'training.assessment.passed'));
  assert.ok(failedEvents.some((row) => row.eventType === 'training.assessment.failed'));
  const certificate = await waitFor('certificate row and S3 artifact document', async () => { const row = await prisma.certificate.findFirst({ where: { tenantId: candidateA.tenantId, candidateId: candidateA.id, courseId: course.id, status: 'ACTIVE' } }); if (!row) return null; const document = await prisma.document.findFirst({ where: { tenantId: candidateA.tenantId, candidateId: candidateA.id, type: 'CERTIFICATE_ARTIFACT', status: 'READY' } }); return document ? { row, document } : null; });
  const failedCertificate = await prisma.certificate.findFirst({ where: { tenantId: candidateB.tenantId, candidateId: candidateB.id, courseId: course.id, status: 'ACTIVE' } });
  assert.equal(failedCertificate, null, 'failed assessment must not create a certificate');
  const passedEnvelope = await prisma.outboxEvent.findFirst({ where: { aggregateId: passedId, eventType: 'training.assessment.passed' }, select: { aggregateId: true, payload: true } });
  assert.ok(passedEnvelope, 'passed event envelope should be available for duplicate replay');
  const kafka = new Kafka({ clientId: 'certificate-duplicate-test', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',') });
  const producer = kafka.producer(); await producer.connect(); await producer.send({ topic: 'training-events', messages: [{ key: passedEnvelope.aggregateId, value: JSON.stringify(passedEnvelope.payload) }] }); await producer.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const duplicateCount = await prisma.certificate.count({ where: { tenantId: candidateA.tenantId, candidateId: candidateA.id, courseId: course.id, status: 'ACTIVE' } });
  assert.equal(duplicateCount, 1);
  console.log(JSON.stringify({ status: 'passed', assessmentId: assessment.body.id, passedResultId: passedId, failedResultId: failedId, passedEvents, failedEvents, certificateId: certificate.row.id, certificateNumber: certificate.row.number, artifactDocumentId: certificate.document.id, duplicateCertificateCount: duplicateCount }, null, 2));
} finally { await prisma.$disconnect(); }
