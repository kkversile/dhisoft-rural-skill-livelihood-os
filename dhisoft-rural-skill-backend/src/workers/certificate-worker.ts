import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { createHash, randomUUID } from 'node:crypto';
import { AppModule } from '../app.module';
import { OutboxService } from '../events/outbox.service';
import { QUEUE_PORT, type QueuePort } from '../infrastructure/ports/queue.port';
import { STORAGE_PORT, type StoragePort } from '../infrastructure/ports/storage.port';
import { PrismaService } from '../prisma/prisma.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const queue = app.get<QueuePort>(QUEUE_PORT);
  const storage = app.get<StoragePort>(STORAGE_PORT);
  const prisma = app.get(PrismaService);
  const outbox = app.get(OutboxService);
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await app.close(); process.exit(0); };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
  console.log(JSON.stringify({ type: 'worker.started', worker: 'certificate-generation' }));
  while (!stopping) {
    const messages = await queue.receive('rural-certificate-generation', 5, 10);
    for (const received of messages) {
      const { message } = received;
      try {
        await prisma.processedEvent.create({ data: { eventId: message.messageId, consumerName: 'certificate-generation-worker', tenantId: message.tenantId } });
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') { await queue.delete('rural-certificate-generation', received.receiptHandle); continue; }
        throw error;
      }
      try {
        const result = await prisma.assessmentResult.findFirst({ where: { id: String(message.data.assessmentResultId), tenantId: message.tenantId, passed: true }, include: { candidate: true, assessment: { include: { course: true, batch: true } } } });
        if (!result) throw new Error('Assessment result not found for certificate job');
        const existingCertificate = await prisma.certificate.findFirst({ where: { tenantId: message.tenantId, candidateId: result.candidateId, courseId: result.assessment.courseId, curriculumVersionId: result.assessment.batch.curriculumVersionId, status: 'ACTIVE' } });
        const number = existingCertificate?.number || `CERT-${new Date().getFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
        const verificationToken = existingCertificate?.verificationToken || randomUUID();
        const payload = Buffer.from(JSON.stringify({ certificateNumber: number, verificationToken, assessmentResultId: result.id, candidateId: result.candidateId, tenantId: message.tenantId, courseId: result.assessment.courseId, generatedAt: new Date().toISOString() }));
        const key = `${message.tenantId}/certificates/${result.id}/certificate.json`;
        await storage.putObject({ key, body: payload, contentType: 'application/json', metadata: { tenantId: message.tenantId, assessmentResultId: result.id } });
        await prisma.$transaction(async (tx) => {
          const certificate = existingCertificate || await tx.certificate.create({ data: { tenantId: message.tenantId, candidateId: result.candidateId, tradeId: result.assessment.course.tradeId, courseId: result.assessment.courseId, curriculumVersionId: result.assessment.batch.curriculumVersionId, number, verificationToken, status: 'ACTIVE' } });
          const existingDocument = await tx.document.findFirst({ where: { tenantId: message.tenantId, storageKey: key } });
          if (!existingDocument) await tx.document.create({ data: { tenantId: message.tenantId, candidateId: result.candidateId, type: 'CERTIFICATE_ARTIFACT', storageKey: key, originalName: `certificate-${result.id}.json`, mimeType: 'application/json', sizeBytes: payload.byteLength, sha256: createHash('sha256').update(payload).digest('hex'), status: 'READY' } });
          if (!existingCertificate) await outbox.enqueue(tx, { tenantId: message.tenantId, eventType: 'training.certificate.issued', aggregateType: 'Certificate', aggregateId: certificate.id, correlationId: message.correlationId, data: { certificateId: certificate.id, assessmentResultId: result.id, certificateNumber: certificate.number } });
        });
        await queue.delete('rural-certificate-generation', received.receiptHandle);
      } catch (error) {
        await prisma.processedEvent.deleteMany({ where: { eventId: message.messageId, consumerName: 'certificate-generation-worker' } });
        console.error(JSON.stringify({ type: 'worker.job.failed', worker: 'certificate-generation', messageId: message.messageId, tenantId: message.tenantId, error: error instanceof Error ? error.message : 'certificate_generation_failed' }));
      }
    }
  }
}

void main();
