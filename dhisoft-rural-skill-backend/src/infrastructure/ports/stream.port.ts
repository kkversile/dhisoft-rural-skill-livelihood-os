import type { EventEnvelope } from '../../events/event.types';

export const STREAM_PORT = Symbol('STREAM_PORT');

export type StreamHandler = (event: EventEnvelope) => Promise<void>;

export interface StreamPort {
  publish(topic: string, event: EventEnvelope): Promise<void>;
  subscribe(topic: string, groupId: string, handler: StreamHandler): Promise<void>;
  subscribeMany(topics: string[], groupId: string, handler: StreamHandler): Promise<void>;
  health(): Promise<{ status: 'ok' | 'down'; provider: string; detail?: string }>;
}
