import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import type { StoragePort, StoragePutInput } from '../ports/storage.port';

function clientConfig() {
  const endpoint = process.env.AWS_ENDPOINT_URL || process.env.S3_ENDPOINT || undefined;
  return {
    region: process.env.AWS_REGION || process.env.S3_REGION || 'ap-south-1',
    endpoint,
    forcePathStyle: Boolean(endpoint),
    credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY || 'test', secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_KEY || 'test' },
  };
}

@Injectable()
export class S3StorageAdapter implements StoragePort {
  private readonly client = new S3Client(clientConfig());
  private readonly bucket = process.env.S3_BUCKET || 'rural-private';
  private readonly provider = process.env.STORAGE_PROVIDER || 's3';

  async putObject(input: StoragePutInput) {
    const result = await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: input.key, Body: input.body, ContentType: input.contentType, Metadata: input.metadata }));
    return { key: input.key, etag: result.ETag };
  }

  async getObject(key: string) {
    const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if (!result.Body) throw new Error('Storage object has no body');
    return Buffer.from(await result.Body.transformToByteArray());
  }

  async deleteObject(key: string) { await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })); }

  async health() {
    try {
      await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: '__health_check__' }));
      return { status: 'ok' as const, provider: this.provider };
    } catch (error) {
      const code = error instanceof Error ? error.name : 'storage_error';
      if (code === 'NoSuchKey' || code === 'NotFound') return { status: 'ok' as const, provider: this.provider };
      return { status: 'down' as const, provider: this.provider, detail: code };
    }
  }
}
