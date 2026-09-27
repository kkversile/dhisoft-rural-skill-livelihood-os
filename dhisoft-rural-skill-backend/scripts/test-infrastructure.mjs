import assert from 'node:assert/strict';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { CreateQueueCommand, DeleteMessageCommand, DeleteQueueCommand, GetQueueUrlCommand, ReceiveMessageCommand, SendMessageCommand, SetQueueAttributesCommand, GetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { Kafka } from 'kafkajs';
import Redis from 'ioredis';

const endpoint = process.env.AWS_ENDPOINT_URL || 'http://127.0.0.1:4567';
const aws = { region: process.env.AWS_REGION || 'ap-south-1', endpoint, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' } };
const sqs = new SQSClient(aws);
const queueUrl = async (name) => (await sqs.send(new GetQueueUrlCommand({ QueueName: name }))).QueueUrl;

async function testSqs() {
  const queue = await queueUrl('rural-notification');
  const token = `infra-test-${Date.now()}`;
  await sqs.send(new SendMessageCommand({ QueueUrl: queue, MessageBody: JSON.stringify({ token }) }));
  let message;
  for (let attempt = 0; attempt < 10 && !message; attempt += 1) { message = (await sqs.send(new ReceiveMessageCommand({ QueueUrl: queue, MaxNumberOfMessages: 1, WaitTimeSeconds: 1 }))).Messages?.[0]; }
  assert.ok(message?.ReceiptHandle);
  assert.equal(JSON.parse(message.Body).token, token);
  await sqs.send(new DeleteMessageCommand({ QueueUrl: queue, ReceiptHandle: message.ReceiptHandle }));

  const suffix = Date.now();
  const dlqName = `rural-test-dlq-${suffix}`;
  const sourceName = `rural-test-source-${suffix}`;
  const dlq = (await sqs.send(new CreateQueueCommand({ QueueName: dlqName }))).QueueUrl;
  const dlqArn = (await sqs.send(new GetQueueAttributesCommand({ QueueUrl: dlq, AttributeNames: ['QueueArn'] }))).Attributes.QueueArn;
  const source = (await sqs.send(new CreateQueueCommand({ QueueName: sourceName, Attributes: { VisibilityTimeout: '0', RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqArn, maxReceiveCount: '2' }) } }))).QueueUrl;
  await sqs.send(new SendMessageCommand({ QueueUrl: source, MessageBody: JSON.stringify({ token }) }));
  for (let attempt = 0; attempt < 6; attempt += 1) { await sqs.send(new ReceiveMessageCommand({ QueueUrl: source, MaxNumberOfMessages: 1, WaitTimeSeconds: 1 })); await new Promise((resolve) => setTimeout(resolve, 100)); }
  const dead = (await sqs.send(new ReceiveMessageCommand({ QueueUrl: dlq, MaxNumberOfMessages: 1, WaitTimeSeconds: 1 }))).Messages?.[0];
  assert.ok(dead, 'message should move to the DLQ after maxReceiveCount');
  await sqs.send(new DeleteQueueCommand({ QueueUrl: source }));
  await sqs.send(new DeleteQueueCommand({ QueueUrl: dlq }));
}

async function testEventBridge() {
  const client = new EventBridgeClient(aws);
  const result = await client.send(new PutEventsCommand({ Entries: [{ EventBusName: process.env.EVENTBUS_NAME || 'rural-events', Source: 'dhisoft.rural.test', DetailType: 'infra.test', Detail: JSON.stringify({ ok: true }) }] }));
  assert.equal(result.FailedEntryCount || 0, 0);
}

async function testRedis() {
  const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  const key = `rural:infra:test:${Date.now()}`;
  await redis.set(key, 'ok', 'EX', 30);
  assert.equal(await redis.get(key), 'ok');
  await redis.del(key);
  await redis.quit();
}

async function testRedpanda() {
  const kafka = new Kafka({ clientId: 'rural-infra-test', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',') });
  const admin = kafka.admin();
  const topic = `rural-infra-test-${Date.now()}`;
  await admin.connect();
  await admin.createTopics({ topics: [{ topic, numPartitions: 1, replicationFactor: 1 }] });
  await admin.disconnect();
  const consumer = kafka.consumer({ groupId: `rural-infra-test-${Date.now()}` });
  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });
  const received = new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('Redpanda consumer timeout')), 10_000); void consumer.run({ eachMessage: async ({ message }) => { if (message.value?.toString() === 'eventing-ok') { clearTimeout(timer); resolve(true); } } }); });
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({ topic, messages: [{ key: 'test', value: 'eventing-ok' }] });
  await received;
  await producer.disconnect();
  await consumer.stop();
  await consumer.disconnect();
  const cleanup = kafka.admin();
  await cleanup.connect();
  await cleanup.deleteTopics({ topics: [topic] });
  await cleanup.disconnect();
}

await testSqs();
await testEventBridge();
await testRedis();
await testRedpanda();
console.log('Infrastructure checks passed: SQS publish/consume, DLQ behavior, EventBridge publish, Redis connectivity, and Redpanda producer/consumer.');
