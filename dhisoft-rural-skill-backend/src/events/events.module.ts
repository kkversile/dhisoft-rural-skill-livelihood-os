import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { AuditEventConsumer, AnalyticsEventConsumer, CertificateEventConsumer, DashboardCacheInvalidationConsumer, NotificationEventConsumer } from './event-consumers';
import { EventConsumerService } from './event-consumer.service';
import { EventPublisherService } from './event-publisher.service';
import { OutboxService } from './outbox.service';

@Module({ imports: [InfrastructureModule], providers: [OutboxService, EventPublisherService, EventConsumerService, AuditEventConsumer, AnalyticsEventConsumer, NotificationEventConsumer, CertificateEventConsumer, DashboardCacheInvalidationConsumer], exports: [OutboxService, EventPublisherService, EventConsumerService, AuditEventConsumer, AnalyticsEventConsumer, NotificationEventConsumer, CertificateEventConsumer, DashboardCacheInvalidationConsumer] })
export class EventsModule {}
