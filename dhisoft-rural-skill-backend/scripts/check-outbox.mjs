import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const row = await prisma.outboxEvent.findFirst({ where: { eventType: 'candidate.registered' }, orderBy: { createdAt: 'desc' }, select: { aggregateId: true, publishedAt: true, attempts: true } });
assert.ok(row?.publishedAt, 'latest candidate event should be published after recovery');
console.log(JSON.stringify(row));
await prisma.$disconnect();
