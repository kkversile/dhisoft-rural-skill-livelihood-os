import { Global, Module } from '@nestjs/common';
import { InMemoryEventBusAdapter, EventBridgeAdapter } from './adapters/event-bus.adapter';
import { NoopCacheAdapter, RedisCacheAdapter } from './adapters/cache.adapters';
import { InMemoryQueueAdapter, SqsQueueAdapter } from './adapters/queue.adapters';
import { LocalFilesystemStorageAdapter } from './adapters/local-filesystem-storage.adapter';
import { S3StorageAdapter } from './adapters/s3-storage.adapter';
import { InMemoryStreamAdapter, KafkaStreamAdapter } from './adapters/stream.adapters';
import { StructuredLogNotificationAdapter } from './adapters/notification.adapter';
import { CACHE_PORT } from './ports/cache.port';
import { EVENT_BUS_PORT } from './ports/event-bus.port';
import { NOTIFICATION_PORT } from './ports/notification.port';
import { QUEUE_PORT } from './ports/queue.port';
import { STORAGE_PORT } from './ports/storage.port';
import { STREAM_PORT } from './ports/stream.port';
import { InfrastructureHealthService } from './infrastructure-health.service';

const provider = (value: string | undefined, fallback: string) => (value || fallback).trim().toLowerCase();

@Global()
@Module({
  providers: [
    LocalFilesystemStorageAdapter, S3StorageAdapter, InMemoryQueueAdapter, SqsQueueAdapter, InMemoryEventBusAdapter, EventBridgeAdapter, InMemoryStreamAdapter, KafkaStreamAdapter, NoopCacheAdapter, RedisCacheAdapter, StructuredLogNotificationAdapter, InfrastructureHealthService,
    { provide: STORAGE_PORT, useFactory: (local: LocalFilesystemStorageAdapter, s3: S3StorageAdapter) => ['localstack', 'aws', 'spaces', 's3'].includes(provider(process.env.STORAGE_PROVIDER || process.env.STORAGE_DRIVER, 'local')) ? s3 : local, inject: [LocalFilesystemStorageAdapter, S3StorageAdapter] },
    { provide: QUEUE_PORT, useFactory: (memory: InMemoryQueueAdapter, sqs: SqsQueueAdapter) => ['localstack', 'aws', 'sqs'].includes(provider(process.env.QUEUE_PROVIDER, 'memory')) ? sqs : memory, inject: [InMemoryQueueAdapter, SqsQueueAdapter] },
    { provide: EVENT_BUS_PORT, useFactory: (memory: InMemoryEventBusAdapter, bridge: EventBridgeAdapter) => ['localstack', 'aws', 'eventbridge'].includes(provider(process.env.EVENTBUS_PROVIDER, 'memory')) ? bridge : memory, inject: [InMemoryEventBusAdapter, EventBridgeAdapter] },
    { provide: STREAM_PORT, useFactory: (memory: InMemoryStreamAdapter, kafka: KafkaStreamAdapter) => ['redpanda', 'kafka', 'aws-kinesis'].includes(provider(process.env.STREAM_PROVIDER, 'memory')) ? kafka : memory, inject: [InMemoryStreamAdapter, KafkaStreamAdapter] },
    { provide: CACHE_PORT, useFactory: (noop: NoopCacheAdapter, redis: RedisCacheAdapter) => provider(process.env.CACHE_PROVIDER, 'noop') === 'redis' ? redis : noop, inject: [NoopCacheAdapter, RedisCacheAdapter] },
    { provide: NOTIFICATION_PORT, useClass: StructuredLogNotificationAdapter },
  ],
  exports: [STORAGE_PORT, QUEUE_PORT, EVENT_BUS_PORT, STREAM_PORT, CACHE_PORT, NOTIFICATION_PORT, InfrastructureHealthService],
})
export class InfrastructureModule {}
