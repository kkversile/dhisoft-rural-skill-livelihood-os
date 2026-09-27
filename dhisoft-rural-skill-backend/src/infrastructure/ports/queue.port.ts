import type { QueueMessage } from '../../events/event.types';

export const QUEUE_PORT = Symbol('QUEUE_PORT');

export type QueueSendOptions = {
  messageGroupId?: string;
  deduplicationId?: string;
  delaySeconds?: number;
};

export type ReceivedQueueMessage = { receiptHandle: string; message: QueueMessage };

export interface QueuePort {
  send(queueName: string, message: QueueMessage, options?: QueueSendOptions): Promise<{ messageId: string }>;
  receive(queueName: string, maxMessages?: number, waitSeconds?: number): Promise<ReceivedQueueMessage[]>;
  delete(queueName: string, receiptHandle: string): Promise<void>;
  health(): Promise<{ status: 'ok' | 'down'; provider: string; detail?: string }>;
}
