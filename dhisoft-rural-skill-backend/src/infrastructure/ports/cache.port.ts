export const CACHE_PORT = Symbol('CACHE_PORT');

export interface CachePort {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  health(): Promise<{ status: 'ok' | 'down'; provider: string; detail?: string }>;
}
