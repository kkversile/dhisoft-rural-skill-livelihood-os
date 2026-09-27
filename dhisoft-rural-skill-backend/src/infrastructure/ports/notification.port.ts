export const NOTIFICATION_PORT = Symbol('NOTIFICATION_PORT');

export type NotificationMessage = {
  tenantId: string;
  correlationId: string;
  recipient: string;
  subject: string;
  body: string;
};

export interface NotificationPort {
  send(message: NotificationMessage): Promise<void>;
}
