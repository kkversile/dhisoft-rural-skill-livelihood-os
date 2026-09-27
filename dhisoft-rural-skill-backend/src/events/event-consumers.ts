import { Inject, Injectable, Logger } from '@nestjs/common';
import { CACHE_PORT, type CachePort } from '../infrastructure/ports/cache.port';
import { NOTIFICATION_PORT, type NotificationPort } from '../infrastructure/ports/notification.port';
import { QUEUE_PORT, type QueuePort } from '../infrastructure/ports/queue.port';
import { PrismaService } from '../prisma/prisma.service';
import type { EventEnvelope, QueueMessage } from './event.types';
import { EventConsumerService } from './event-consumer.service';

@Injectable()
export class AuditEventConsumer {
  private readonly logger = new Logger('AuditEventConsumer');
  constructor(private readonly prisma: PrismaService, private readonly idempotency: EventConsumerService) {}
  handle(event: EventEnvelope) { return this.idempotency.processOnce(event, 'audit-consumer', async () => { await this.prisma.auditEvent.create({ data: { tenantId: event.tenantId, action: `event.${event.eventType}`, entity: event.aggregateType, entityId: event.aggregateId, correlationId: event.correlationId, newValue: { eventId: event.eventId, eventVersion: event.eventVersion } } }); this.logger.log(JSON.stringify({ type: 'event.consumed', consumer: 'audit-consumer', eventId: event.eventId, tenantId: event.tenantId, correlationId: event.correlationId })); }); }
}

@Injectable()
export class AnalyticsEventConsumer {
  private readonly logger = new Logger('AnalyticsEventConsumer');
  constructor(private readonly idempotency: EventConsumerService) {}
  handle(event: EventEnvelope) { return this.idempotency.processOnce(event, 'analytics-consumer', async () => { this.logger.log(JSON.stringify({ type: 'analytics.event', eventId: event.eventId, eventType: event.eventType, tenantId: event.tenantId, aggregateId: event.aggregateId, correlationId: event.correlationId })); }); }
}

@Injectable()
export class NotificationEventConsumer {
  constructor(@Inject(NOTIFICATION_PORT) private readonly notification: NotificationPort, private readonly idempotency: EventConsumerService) {}
  handle(event: EventEnvelope) { return this.idempotency.processOnce(event, 'notification-consumer', async () => { const recipient = typeof event.data.recipient === 'string' ? event.data.recipient : ''; if (recipient) await this.notification.send({ tenantId: event.tenantId, correlationId: event.correlationId, recipient, subject: event.eventType, body: 'A workflow event requires attention.' }); }); }
}

@Injectable()
export class CertificateEventConsumer {
  constructor(@Inject(QUEUE_PORT) private readonly queue: QueuePort, private readonly idempotency: EventConsumerService) {}
  handle(event: EventEnvelope) { return this.idempotency.processOnce(event, 'certificate-consumer', async () => { if (event.eventType !== 'training.assessment.passed') return; const message: QueueMessage = { messageId: event.eventId, messageVersion: 1, tenantId: event.tenantId, correlationId: event.correlationId, idempotencyKey: `certificate:${event.aggregateId}`, data: { assessmentResultId: event.aggregateId } }; await this.queue.send('rural-certificate-generation', message, { deduplicationId: message.idempotencyKey }); }); }
}

@Injectable()
export class DashboardCacheInvalidationConsumer {
  private readonly eventTypes = new Set(['training.assessment.completed', 'training.assessment.passed', 'employment.placement.created', 'employment.retention.updated', 'livelihood.payout.completed']);
  constructor(@Inject(CACHE_PORT) private readonly cache: CachePort, private readonly idempotency: EventConsumerService) {}
  handle(event: EventEnvelope) {
    if (!this.eventTypes.has(event.eventType)) return Promise.resolve(false);
    return this.idempotency.processOnce(event, 'dashboard-cache-invalidation', async () => { await this.cache.delete(`tenant:${event.tenantId}:dashboard`); });
  }
}
