import { DeleteMessageCommand, GetQueueUrlCommand, ReceiveMessageCommand, SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { QueueMessage } from '../../events/event.types';
import type { QueuePort, QueueSendOptions, ReceivedQueueMessage } from '../ports/queue.port';

function clientConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL || undefined;
  return { region: process.env.AWS_REGION || 'ap-south-1', endpoint, forcePathStyle: Boolean(endpoint), credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' } };
}

@Injectable()
export class InMemoryQueueAdapter implements QueuePort {
  readonly messages: Array<{ queueName: string; message: QueueMessage }> = [];
  async send(queueName: string, message: QueueMessage) { this.messages.push({ queueName, message }); return { messageId: message.messageId }; }
  async receive(queueName: string, maxMessages = 1): Promise<ReceivedQueueMessage[]> { return this.messages.filter((item) => item.queueName === queueName).slice(0, maxMessages).map((item) => ({ receiptHandle: item.message.messageId, message: item.message })); }
  async delete(queueName: string, receiptHandle: string) { const index = this.messages.findIndex((item) => item.queueName === queueName && item.message.messageId === receiptHandle); if (index >= 0) this.messages.splice(index, 1); }
  async health() { return { status: 'ok' as const, provider: 'memory' }; }
}

@Injectable()
export class SqsQueueAdapter implements QueuePort {
  private readonly client = new SQSClient(clientConfig());
  private readonly urlCache = new Map<string, string>();
  private readonly provider = process.env.QUEUE_PROVIDER || 'sqs';

  private async queueUrl(queueName: string) {
    const cached = this.urlCache.get(queueName);
    if (cached) return cached;
    const configured = process.env[`SQS_QUEUE_URL_${queueName.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`];
    const url = configured || (await this.client.send(new GetQueueUrlCommand({ QueueName: queueName }))).QueueUrl;
    if (!url) throw new Error(`Queue URL not found for ${queueName}`);
    this.urlCache.set(queueName, url);
    return url;
  }

  async send(queueName: string, message: QueueMessage, options: QueueSendOptions = {}) {
    const messageId = message.messageId || randomUUID();
    const queueUrl = await this.queueUrl(queueName);
    const fifo = queueName.endsWith('.fifo') || queueUrl.endsWith('.fifo');
    await this.client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify({ ...message, messageId }), DelaySeconds: options.delaySeconds, ...(fifo ? { MessageGroupId: options.messageGroupId || message.tenantId, MessageDeduplicationId: options.deduplicationId || message.idempotencyKey } : {}) }));
    return { messageId };
  }

  async receive(queueName: string, maxMessages = 1, waitSeconds = 10) {
    const result = await this.client.send(new ReceiveMessageCommand({ QueueUrl: await this.queueUrl(queueName), MaxNumberOfMessages: Math.min(10, maxMessages), WaitTimeSeconds: waitSeconds }));
    return (result.Messages || []).flatMap((item) => { if (!item.ReceiptHandle || !item.Body) return []; try { return [{ receiptHandle: item.ReceiptHandle, message: JSON.parse(item.Body) as QueueMessage }]; } catch { return []; } });
  }

  async delete(queueName: string, receiptHandle: string) { await this.client.send(new DeleteMessageCommand({ QueueUrl: await this.queueUrl(queueName), ReceiptHandle: receiptHandle })); }

  async health() {
    try { await this.queueUrl(process.env.HEALTH_QUEUE_NAME || 'rural-notification'); return { status: 'ok' as const, provider: this.provider }; }
    catch (error) { return { status: 'down' as const, provider: this.provider, detail: error instanceof Error ? error.message : 'queue_error' }; }
  }
}
