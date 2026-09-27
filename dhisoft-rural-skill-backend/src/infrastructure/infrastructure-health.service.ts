import { Inject, Injectable } from '@nestjs/common';
import { CACHE_PORT, type CachePort } from './ports/cache.port';
import { EVENT_BUS_PORT, type EventBusPort } from './ports/event-bus.port';
import { QUEUE_PORT, type QueuePort } from './ports/queue.port';
import { STORAGE_PORT, type StoragePort } from './ports/storage.port';
import { STREAM_PORT, type StreamPort } from './ports/stream.port';

@Injectable()
export class InfrastructureHealthService {
  constructor(
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
    @Inject(QUEUE_PORT) private readonly queue: QueuePort,
    @Inject(EVENT_BUS_PORT) private readonly eventBus: EventBusPort,
    @Inject(STREAM_PORT) private readonly stream: StreamPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
  ) {}

  async check() {
    const [storage, queue, eventBus, stream, cache] = await Promise.all([this.storage.health(), this.queue.health(), this.eventBus.health(), this.stream.health(), this.cache.health()]);
    return { storage, queue, eventBus, stream, cache };
  }
}
