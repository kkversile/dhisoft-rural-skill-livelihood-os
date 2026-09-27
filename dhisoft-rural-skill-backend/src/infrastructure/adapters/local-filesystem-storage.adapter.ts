import { Injectable } from '@nestjs/common';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, posix, resolve, sep } from 'node:path';
import type { StoragePort, StoragePutInput } from '../ports/storage.port';

@Injectable()
export class LocalFilesystemStorageAdapter implements StoragePort {
  private readonly root = resolve(process.env.LOCAL_STORAGE_PATH || './storage', 'uploads');

  private safePath(key: string) {
    const normalized = posix.normalize(key.replaceAll('\\', '/')).replace(/^\/+/, '');
    const full = resolve(this.root, ...normalized.split('/'));
    if (full !== this.root && !full.startsWith(`${this.root}${sep}`) && !full.startsWith(`${this.root}/`)) throw new Error('Invalid storage key');
    return full;
  }

  async putObject(input: StoragePutInput) {
    const full = this.safePath(input.key);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, input.body, { flag: 'wx' });
    return { key: input.key };
  }

  getObject(key: string) { return readFile(this.safePath(key)); }

  async deleteObject(key: string) {
    await unlink(this.safePath(key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== 'ENOENT') throw error; });
  }

  async health() { return { status: 'ok' as const, provider: 'local-filesystem' }; }
}
