import { Inject, Injectable } from '@nestjs/common';
import { EVENT_BUS_PORT, type EventBusPort } from '../infrastructure/ports/event-bus.port';
import { STREAM_PORT, type StreamPort } from '../infrastructure/ports/stream.port';
import type { EventEnvelope } from './event.types';

export function topicForEvent(eventType: string) {
  const context = eventType.split('.')[0] || 'audit';
  return `${context}-events`;
}

@Injectable()
export class EventPublisherService {
  constructor(@Inject(STREAM_PORT) private readonly stream: StreamPort, @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort) {}
  async publishToStream(event: EventEnvelope) { await this.stream.publish(topicForEvent(event.eventType), event); }
  async publishToIntegrationBus(event: EventEnvelope) { await this.eventBus.publish(event); }
}
