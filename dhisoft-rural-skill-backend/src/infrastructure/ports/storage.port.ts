export const STORAGE_PORT = Symbol('STORAGE_PORT');

export type StoragePutInput = {
  key: string;
  body: Buffer;
  contentType: string;
  metadata?: Record<string, string>;
};

export interface StoragePort {
  putObject(input: StoragePutInput): Promise<{ key: string; etag?: string }>;
  getObject(key: string): Promise<Buffer>;
  deleteObject(key: string): Promise<void>;
  health(): Promise<{ status: 'ok' | 'down'; provider: string; detail?: string }>;
}
