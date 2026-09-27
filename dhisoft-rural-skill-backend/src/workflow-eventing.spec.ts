import { InMemoryEventBusAdapter } from './infrastructure/adapters/event-bus.adapter';
import { InMemoryStreamAdapter } from './infrastructure/adapters/stream.adapters';
import { OutboxService } from './events/outbox.service';
import { assessmentEventTypes } from './workflow/workflow.service';

describe('assessment event contracts', () => {
  it('emits completed plus passed or failed based on the actual result', () => {
    expect(assessmentEventTypes(true)).toEqual(['training.assessment.completed', 'training.assessment.passed']);
    expect(assessmentEventTypes(false)).toEqual(['training.assessment.completed', 'training.assessment.failed']);
    expect(assessmentEventTypes('false')).toEqual(['training.assessment.completed', 'training.assessment.failed']);
  });

  it('publishes selected integration events to EventBridge after stream delivery', async () => {
    const stream = new InMemoryStreamAdapter();
    const bus = new InMemoryEventBusAdapter();
    const event = { eventId: '11111111-1111-4111-8111-111111111111', eventType: 'employment.placement.created', eventVersion: 1, occurredAt: new Date().toISOString(), tenantId: '22222222-2222-4222-8222-222222222222', aggregateType: 'Placement', aggregateId: '33333333-3333-4333-8333-333333333333', correlationId: '44444444-4444-4444-8444-444444444444', causationId: null, data: {} };
    const row = { id: event.eventId, eventId: event.eventId, tenantId: event.tenantId, eventType: event.eventType, payload: event, attempts: 0 };
    let published = false;
    const prisma = { outboxEvent: { findFirst: async () => published ? null : row, updateMany: async () => ({ count: 1 }), findUnique: async () => row, update: async () => { published = true; } } };
    const service = new OutboxService(prisma as never, stream, bus);
    expect(await service.publishPending()).toEqual({ published: 1, failed: 0 });
    expect(stream.events).toHaveLength(1);
    expect(bus.events).toHaveLength(1);
  });
});
