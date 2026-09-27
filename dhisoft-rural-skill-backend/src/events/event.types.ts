export type EventEnvelope<T = Record<string, unknown>> = {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  tenantId: string;
  aggregateType: string;
  aggregateId: string;
  correlationId: string;
  causationId: string | null;
  data: T;
};

export type QueueMessage<T = Record<string, unknown>> = {
  messageId: string;
  messageVersion: number;
  tenantId: string;
  correlationId: string;
  idempotencyKey: string;
  data: T;
};
