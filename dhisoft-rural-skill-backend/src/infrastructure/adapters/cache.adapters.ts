import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import type { CachePort } from '../ports/cache.port';

@Injectable()
export class NoopCacheAdapter implements CachePort {
  async get(_key: string) { return null; }
  async set(_key: string, _value: string, _ttlSeconds?: number) { /* no-op fallback */ }
  async delete(_key: string) { /* no-op fallback */ }
  async health() { return { status: 'ok' as const, provider: 'noop' }; }
}

@Injectable()
export class RedisCacheAdapter implements CachePort {
  private readonly redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  async get(key: string) { await this.redis.connect().catch(() => undefined); return this.redis.get(key); }
  async set(key: string, value: string, ttlSeconds?: number) { await this.redis.connect().catch(() => undefined); if (ttlSeconds) await this.redis.set(key, value, 'EX', ttlSeconds); else await this.redis.set(key, value); }
  async delete(key: string) { await this.redis.connect().catch(() => undefined); await this.redis.del(key); }
  async health() { try { await this.redis.connect().catch(() => undefined); await this.redis.ping(); return { status: 'ok' as const, provider: 'redis' }; } catch (error) { return { status: 'down' as const, provider: 'redis', detail: error instanceof Error ? error.message : 'redis_error' }; } }
}
