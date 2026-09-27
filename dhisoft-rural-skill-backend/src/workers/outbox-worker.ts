import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OutboxService } from '../events/outbox.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const worker = app.get(OutboxService);
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; await app.close(); process.exit(0); };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
  console.log(JSON.stringify({ type: 'worker.started', worker: 'outbox-publisher' }));
  while (!stopping) { await worker.publishPending(Number(process.env.OUTBOX_BATCH_SIZE || 25)); await new Promise((resolve) => setTimeout(resolve, Number(process.env.OUTBOX_POLL_MS || 2000))); }
}

void main();
