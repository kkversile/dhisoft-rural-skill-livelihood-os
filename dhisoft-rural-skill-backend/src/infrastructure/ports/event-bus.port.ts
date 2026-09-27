import type { EventEnvelope } from '../../events/event.types';

export const EVENT_BUS_PORT = Symbol('EVENT_BUS_PORT');

export interface EventBusPort {
  publish(event: EventEnvelope): Promise<void>;
  health(): Promise<{ status: 'ok' | 'down'; provider: string; detail?: string }>;
}
