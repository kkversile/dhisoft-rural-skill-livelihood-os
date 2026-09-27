import { Injectable, Logger } from '@nestjs/common';
import type { NotificationMessage, NotificationPort } from '../ports/notification.port';

@Injectable()
export class StructuredLogNotificationAdapter implements NotificationPort {
  private readonly logger = new Logger('NotificationAdapter');
  async send(message: NotificationMessage) { this.logger.log(JSON.stringify({ type: 'notification.sent', tenantId: message.tenantId, correlationId: message.correlationId, recipient: message.recipient, subject: message.subject })); }
}
