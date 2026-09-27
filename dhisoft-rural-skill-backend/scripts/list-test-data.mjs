import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const marker = { contains: 'Playwright', mode: 'insensitive' };
const recorded = { contains: 'Recorded', mode: 'insensitive' };
const videoCheck = { contains: 'Video Stream Check', mode: 'insensitive' };
const chrome = { contains: 'CHROME-RECORDED', mode: 'insensitive' };
const checks = [
  ['course', { OR: [{ title: marker }, { title: recorded }, { title: videoCheck }] }, ['id', 'title', 'code']],
  ['candidate', { fullName: marker }, ['id', 'fullName']],
  ['trainingPartner', { name: marker }, ['id', 'name']],
  ['trainerProfile', { name: marker }, ['id', 'name']],
  ['trainingCentre', { name: marker }, ['id', 'name']],
  ['batch', { name: marker }, ['id', 'name']],
  ['attendanceRecord', { sessionType: marker }, ['id', 'sessionType']],
  ['practicalAssignment', { title: marker }, ['id', 'title']],
  ['assessment', { name: marker }, ['id', 'name']],
  ['apprenticeship', { providerName: marker }, ['id', 'providerName']],
  ['employer', { name: marker }, ['id', 'name']],
  ['vacancy', { title: marker }, ['id', 'title']],
  ['serviceArea', { name: marker }, ['id', 'name']],
  ['serviceOpportunity', { title: marker }, ['id', 'title']],
  ['serviceBooking', { customerName: marker }, ['id', 'customerName']],
  ['complaint', { OR: [{ category: marker }, { category: chrome }] }, ['id', 'category']],
  ['payment', { providerReference: marker }, ['id', 'providerReference']],
  ['payout', { idempotencyKey: marker }, ['id', 'idempotencyKey']],
  ['incomeRecord', { source: marker }, ['id', 'source']],
];
try {
  for (const [name, where, fields] of checks) {
    const rows = await p[name].findMany({ where, select: Object.fromEntries(fields.map((field) => [field, true])) });
    if (rows.length) console.log(JSON.stringify({ model: name, rows }));
  }
} finally { await p.$disconnect(); }
