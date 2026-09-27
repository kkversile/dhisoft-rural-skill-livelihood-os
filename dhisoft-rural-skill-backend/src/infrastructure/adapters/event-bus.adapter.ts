import { DescribeEventBusCommand, EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { Injectable } from '@nestjs/common';
import type { EventEnvelope } from '../../events/event.types';
import type { EventBusPort } from '../ports/event-bus.port';

function config() { const endpoint = process.env.AWS_ENDPOINT_URL; return { region: process.env.AWS_REGION || 'ap-south-1', endpoint, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' } }; }

@Injectable()
export class InMemoryEventBusAdapter implements EventBusPort {
  readonly events: EventEnvelope[] = [];
  async publish(event: EventEnvelope) { this.events.push(event); }
  async health() { return { status: 'ok' as const, provider: 'memory' }; }
}

@Injectable()
export class EventBridgeAdapter implements EventBusPort {
  private readonly client = new EventBridgeClient(config());
  private readonly busName = process.env.EVENTBUS_NAME || 'rural-events';
  private readonly provider = process.env.EVENTBUS_PROVIDER || 'eventbridge';
  async publish(event: EventEnvelope) {
    const result = await this.client.send(new PutEventsCommand({ Entries: [{ EventBusName: this.busName, Source: 'dhisoft.rural', DetailType: event.eventType, Detail: JSON.stringify(event), Resources: [event.aggregateId] }] }));
    if ((result.FailedEntryCount || 0) > 0) throw new Error('EventBridge rejected event');
  }
  async health() {
    try { await this.client.send(new DescribeEventBusCommand({ Name: this.busName })); return { status: 'ok' as const, provider: this.provider }; }
    catch (error) { return { status: 'down' as const, provider: this.provider, detail: error instanceof Error ? error.message : 'event_bus_error' }; }
  }
}
