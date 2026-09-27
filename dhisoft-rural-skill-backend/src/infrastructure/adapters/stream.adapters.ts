import { Injectable } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import type { EventEnvelope } from '../../events/event.types';
import type { StreamHandler, StreamPort } from '../ports/stream.port';

@Injectable()
export class InMemoryStreamAdapter implements StreamPort {
  readonly events: Array<{ topic: string; event: EventEnvelope }> = [];
  private readonly handlers = new Map<string, StreamHandler[]>();
  async publish(topic: string, event: EventEnvelope) { this.events.push({ topic, event }); for (const handler of this.handlers.get(topic) || []) await handler(event); }
  async subscribe(topic: string, groupId: string, handler: StreamHandler) { await this.subscribeMany([topic], groupId, handler); }
  async subscribeMany(topics: string[], _groupId: string, handler: StreamHandler) { for (const topic of topics) { const list = this.handlers.get(topic) || []; list.push(handler); this.handlers.set(topic, list); } }
  async health() { return { status: 'ok' as const, provider: 'memory' }; }
}

@Injectable()
export class KafkaStreamAdapter implements StreamPort {
  private readonly kafka = new Kafka({ clientId: process.env.KAFKA_CLIENT_ID || 'rural-api', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',').map((value) => value.trim()).filter(Boolean) });
  private readonly producer = this.kafka.producer();
  private readonly provider = process.env.STREAM_PROVIDER || 'redpanda';
  private readonly consumers = new Map<string, ReturnType<Kafka['consumer']>>();
  private readonly runningConsumers = new Set<string>();
  private connected = false;
  private async connectProducer() { if (!this.connected) { await this.producer.connect(); this.connected = true; } }
  async publish(topic: string, event: EventEnvelope) { await this.connectProducer(); await this.producer.send({ topic, messages: [{ key: event.aggregateId, value: JSON.stringify(event), headers: { eventType: event.eventType, tenantId: event.tenantId, correlationId: event.correlationId } }] }); }
  async subscribe(topic: string, groupId: string, handler: StreamHandler) {
    await this.subscribeMany([topic], groupId, handler);
  }
  async subscribeMany(topics: string[], groupId: string, handler: StreamHandler) {
    let consumer = this.consumers.get(groupId);
    if (!consumer) { consumer = this.kafka.consumer({ groupId }); this.consumers.set(groupId, consumer); await consumer.connect(); }
    for (const topic of topics) await consumer.subscribe({ topic, fromBeginning: false });
    if (!this.runningConsumers.has(groupId)) {
      this.runningConsumers.add(groupId);
      await consumer.run({ eachMessage: async ({ message }) => { if (!message.value) return; await handler(JSON.parse(message.value.toString()) as EventEnvelope); } });
    }
  }
  async health() { try { const admin = this.kafka.admin(); await admin.connect(); await admin.listTopics(); await admin.disconnect(); return { status: 'ok' as const, provider: this.provider }; } catch (error) { return { status: 'down' as const, provider: this.provider, detail: error instanceof Error ? error.message : 'stream_error' }; } }
}
