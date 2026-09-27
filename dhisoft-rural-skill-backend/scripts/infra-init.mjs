import { CreateBucketCommand, PutPublicAccessBlockCommand, S3Client } from '@aws-sdk/client-s3';
import { CreateQueueCommand, GetQueueAttributesCommand, SetQueueAttributesCommand, SQSClient } from '@aws-sdk/client-sqs';
import { CreateEventBusCommand, EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { Kafka } from 'kafkajs';

const endpoint = process.env.AWS_ENDPOINT_URL || 'http://127.0.0.1:4567';
const region = process.env.AWS_REGION || 'ap-south-1';
const credentials = { accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test' };
const bucket = process.env.S3_BUCKET || 'rural-private';
const bus = process.env.EVENTBUS_NAME || 'rural-events';
const queueNames = ['rural-document-processing', 'rural-certificate-generation', 'rural-notification', 'rural-report-generation'];
const topics = ['candidate-events', 'training-events', 'employment-events', 'livelihood-events', 'audit-events'];
const aws = { region, endpoint, credentials };

async function initAws() {
  const s3 = new S3Client({ ...aws, forcePathStyle: true });
  try { await s3.send(new CreateBucketCommand({ Bucket: bucket })); } catch (error) { if (!['BucketAlreadyOwnedByYou', 'BucketAlreadyExists'].includes(error?.Code)) throw error; }
  await s3.send(new PutPublicAccessBlockCommand({ Bucket: bucket, PublicAccessBlockConfiguration: { BlockPublicAcls: true, IgnorePublicAcls: true, BlockPublicPolicy: true, RestrictPublicBuckets: true } }));
  const sqs = new SQSClient(aws);
  for (const name of queueNames) {
    const dlqName = `${name}-dlq`;
    const dlqUrl = (await sqs.send(new CreateQueueCommand({ QueueName: dlqName, Attributes: { MessageRetentionPeriod: '1209600' } }))).QueueUrl;
    if (!dlqUrl) throw new Error(`Could not create ${dlqName}`);
    const dlqAttrs = await sqs.send(new GetQueueAttributesCommand({ QueueUrl: dlqUrl, AttributeNames: ['QueueArn'] }));
    const queueUrl = (await sqs.send(new CreateQueueCommand({ QueueName: name, Attributes: { VisibilityTimeout: '30', ReceiveMessageWaitTimeSeconds: '10', RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqAttrs.Attributes?.QueueArn, maxReceiveCount: '5' }) } }))).QueueUrl;
    if (!queueUrl) throw new Error(`Could not create ${name}`);
    await sqs.send(new SetQueueAttributesCommand({ QueueUrl: queueUrl, Attributes: { VisibilityTimeout: '30', ReceiveMessageWaitTimeSeconds: '10', RedrivePolicy: JSON.stringify({ deadLetterTargetArn: dlqAttrs.Attributes?.QueueArn, maxReceiveCount: '5' }) } }));
  }
  const eventBridge = new EventBridgeClient(aws);
  try { await eventBridge.send(new CreateEventBusCommand({ Name: bus })); } catch (error) { if (!['ResourceAlreadyExistsException', 'ResourceAlreadyExists'].includes(error?.name)) throw error; }
}

async function initRedpanda() {
  const kafka = new Kafka({ clientId: 'rural-infra-init', brokers: (process.env.KAFKA_BROKERS || '127.0.0.1:19092').split(',') });
  const admin = kafka.admin();
  await admin.connect();
  const existing = new Set(await admin.listTopics());
  const missing = topics.filter((topic) => !existing.has(topic));
  if (missing.length) await admin.createTopics({ topics: missing.map((topic) => ({ topic, numPartitions: 1, replicationFactor: 1 })) });
  await admin.disconnect();
}

await initAws();
await initRedpanda();
console.log(JSON.stringify({ status: 'ok', bucket, queues: queueNames, dlqs: queueNames.map((name) => `${name}-dlq`), eventBus: bus, topics }));
