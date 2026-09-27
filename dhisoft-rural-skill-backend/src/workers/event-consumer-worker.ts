import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { STREAM_PORT, type StreamPort } from '../infrastructure/ports/stream.port';
import { AuditEventConsumer, AnalyticsEventConsumer, CertificateEventConsumer, DashboardCacheInvalidationConsumer, NotificationEventConsumer } from '../events/event-consumers';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  const stream = app.get<StreamPort>(STREAM_PORT);
  const audit = app.get(AuditEventConsumer);
  const analytics = app.get(AnalyticsEventConsumer);
  const notification = app.get(NotificationEventConsumer);
  const certificate = app.get(CertificateEventConsumer);
  const dashboardCache = app.get(DashboardCacheInvalidationConsumer);
  const topics = ['candidate-events', 'training-events', 'employment-events', 'livelihood-events', 'document-events'];
  await stream.subscribeMany(topics, 'audit-consumer', async (event) => { await audit.handle(event); });
  await stream.subscribeMany(topics, 'analytics-consumer', async (event) => { await analytics.handle(event); });
  await stream.subscribeMany(topics, 'notification-consumer', async (event) => { await notification.handle(event); });
  await stream.subscribeMany(['training-events'], 'certificate-consumer', async (event) => { await certificate.handle(event); });
  await stream.subscribeMany(topics, 'dashboard-cache-invalidation', async (event) => { await dashboardCache.handle(event); });
  console.log(JSON.stringify({ type: 'worker.started', worker: 'event-consumers', consumerGroups: ['audit-consumer', 'analytics-consumer', 'notification-consumer', 'certificate-consumer'], topics }));
  const stop = async () => { await app.close(); process.exit(0); };
  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

void main();
