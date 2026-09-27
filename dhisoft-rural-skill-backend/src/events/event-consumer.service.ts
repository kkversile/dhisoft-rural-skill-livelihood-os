import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { EventEnvelope } from './event.types';

@Injectable()
export class EventConsumerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async processOnce(event: EventEnvelope, consumerName: string, handler: () => Promise<void>) {
    try { await this.prisma.processedEvent.create({ data: { eventId: event.eventId, consumerName, tenantId: event.tenantId } }); }
    catch (error) { if (error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002') return false; throw error; }
    try { await handler(); return true; }
    catch (error) { await this.prisma.processedEvent.deleteMany({ where: { eventId: event.eventId, consumerName } }); throw error; }
  }
}
