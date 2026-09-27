import { InMemoryEventBusAdapter } from './infrastructure/adapters/event-bus.adapter';
import { InMemoryQueueAdapter } from './infrastructure/adapters/queue.adapters';
import { InMemoryStreamAdapter } from './infrastructure/adapters/stream.adapters';
import { EventConsumerService } from './events/event-consumer.service';
import type { EventEnvelope, QueueMessage } from './events/event.types';

const event: EventEnvelope = { eventId: '11111111-1111-4111-8111-111111111111', eventType: 'candidate.registered', eventVersion: 1, occurredAt: new Date().toISOString(), tenantId: '22222222-2222-4222-8222-222222222222', aggregateType: 'Candidate', aggregateId: '33333333-3333-4333-8333-333333333333', correlationId: '44444444-4444-4444-8444-444444444444', causationId: null, data: { candidateId: '33333333-3333-4333-8333-333333333333' } };

describe('eventing adapters', () => {
  it('publishes and delivers an in-memory stream event', async () => {
    const stream = new InMemoryStreamAdapter();
    const received: EventEnvelope[] = [];
    await stream.subscribe('candidate-events', 'test-group', async (value) => { received.push(value); });
    await stream.publish('candidate-events', event);
    expect(received).toEqual([event]);
  });

  it('keeps queue messages and event-bus events provider-neutral', async () => {
    const queue = new InMemoryQueueAdapter();
    const message: QueueMessage = { messageId: event.eventId, messageVersion: 1, tenantId: event.tenantId, correlationId: event.correlationId, idempotencyKey: 'test:1', data: { aggregateId: event.aggregateId } };
    await queue.send('rural-notification', message);
    expect(queue.messages[0]).toEqual({ queueName: 'rural-notification', message });
    const bus = new InMemoryEventBusAdapter();
    await bus.publish(event);
    expect(bus.events).toEqual([event]);
  });

  it('runs a consumer handler once for duplicate events', async () => {
    const processed = new Set<string>();
    const fakePrisma = { processedEvent: { create: async ({ data }: { data: { eventId: string; consumerName: string } }) => { const key = `${data.eventId}:${data.consumerName}`; if (processed.has(key)) { const error = new Error('duplicate') as Error & { code?: string }; error.code = 'P2002'; throw error; } processed.add(key); }, deleteMany: async () => undefined } };
    const service = new EventConsumerService(fakePrisma as never);
    let runs = 0;
    expect(await service.processOnce(event, 'test-consumer', async () => { runs += 1; })).toBe(true);
    expect(await service.processOnce(event, 'test-consumer', async () => { runs += 1; })).toBe(false);
    expect(runs).toBe(1);
  });
});
