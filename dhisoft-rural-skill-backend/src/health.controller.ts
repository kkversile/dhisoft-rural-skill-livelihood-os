import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { InfrastructureHealthService } from './infrastructure/infrastructure-health.service';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService, private readonly infrastructure: InfrastructureHealthService) {}

  @Get('live') live() { return { status: 'ok', service: 'dhisoft-rural-skill-api', time: new Date().toISOString() }; }

  @Get('ready')
  async ready(@Res({ passthrough: true }) response: Response) {
    const dependencies = await this.dependencies();
    const ready = Object.values(dependencies).every((value) => value === 'ok');
    if (!ready) response.status(503);
    return { status: ready ? 'ok' : 'degraded', dependencies, time: new Date().toISOString() };
  }

  @Get()
  async health() {
    const dependencies = await this.dependencies();
    return { status: dependencies.database === 'ok' ? 'ok' : 'degraded', database: dependencies.database, service: 'dhisoft-rural-skill-api', time: new Date().toISOString() };
  }

  private async dependencies() {
    const database = await this.prisma.$queryRaw`SELECT 1`.then(() => 'ok' as const).catch(() => 'down' as const);
    const infra = await this.infrastructure.check();
    return { database, redis: infra.cache.status, redpanda: infra.stream.status, localstack: infra.storage.status === 'ok' && infra.queue.status === 'ok' && infra.eventBus.status === 'ok' ? 'ok' as const : 'down' as const };
  }
}
