import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { STREAM_PORT, type StreamPort } from '../infrastructure/ports/stream.port';
import { EVENT_BUS_PORT, type EventBusPort } from '../infrastructure/ports/event-bus.port';
import { PrismaService } from '../prisma/prisma.service';
import type { EventEnvelope } from './event.types';
import { topicForEvent } from './event-publisher.service';

type DbClient = PrismaService | Prisma.TransactionClient;
type EnqueueInput = { tenantId: string; eventType: string; aggregateType: string; aggregateId: string; correlationId: string; causationId?: string | null; data?: Record<string, unknown> };

@Injectable()
export class OutboxService {
  private readonly logger = new Logger('OutboxService');
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(STREAM_PORT) private readonly stream: StreamPort, @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort) {}

  async enqueue(db: DbClient, input: EnqueueInput) {
    const event: EventEnvelope = { eventId: randomUUID(), eventType: input.eventType, eventVersion: 1, occurredAt: new Date().toISOString(), tenantId: input.tenantId, aggregateType: input.aggregateType, aggregateId: input.aggregateId, correlationId: input.correlationId, causationId: input.causationId || null, data: input.data || {} };
    await db.outboxEvent.create({ data: { id: event.eventId, eventId: event.eventId, tenantId: input.tenantId, eventType: event.eventType, eventVersion: event.eventVersion, aggregateType: event.aggregateType, aggregateId: event.aggregateId, correlationId: event.correlationId, causationId: event.causationId, payload: event as unknown as Prisma.InputJsonValue } });
    return event;
  }

  async publishPending(limit = 25) {
    let published = 0; let failed = 0;
    for (let i = 0; i < limit; i += 1) {
      const row = await this.claimOne();
      if (!row) break;
      try {
        const event = row.payload as unknown as EventEnvelope;
        await this.stream.publish(topicForEvent(row.eventType), event);
        if (['training.certificate.issued', 'employment.placement.created', 'employment.retention.updated', 'livelihood.payout.completed'].includes(row.eventType)) await this.eventBus.publish(event);
        await this.prisma.outboxEvent.update({ where: { id: row.id }, data: { publishedAt: new Date(), attempts: { increment: 1 }, lockedAt: null, lastError: null } });
        published += 1;
      } catch (error) {
        failed += 1;
        const message = error instanceof Error ? error.message.slice(0, 1000) : 'event_publish_failed';
        await this.prisma.outboxEvent.update({ where: { id: row.id }, data: { attempts: { increment: 1 }, availableAt: new Date(Date.now() + Math.min(300_000, 2 ** Math.min(row.attempts, 8) * 1_000)), lockedAt: null, lastError: message } }).catch(() => undefined);
        this.logger.error(JSON.stringify({ type: 'outbox.publish.failed', eventId: row.eventId, eventType: row.eventType, tenantId: row.tenantId, error: message }));
      }
    }
    return { published, failed };
  }

  private async claimOne() {
    const stale = new Date(Date.now() - 5 * 60_000);
    const candidate = await this.prisma.outboxEvent.findFirst({ where: { publishedAt: null, availableAt: { lte: new Date() }, OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }] }, orderBy: { createdAt: 'asc' } });
    if (!candidate) return null;
    const claimed = await this.prisma.outboxEvent.updateMany({ where: { id: candidate.id, publishedAt: null, OR: [{ lockedAt: null }, { lockedAt: { lt: stale } }] }, data: { lockedAt: new Date() } });
    return claimed.count === 1 ? this.prisma.outboxEvent.findUnique({ where: { id: candidate.id } }) : null;
  }
}
