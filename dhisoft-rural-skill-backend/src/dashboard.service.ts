import { Inject, Injectable } from '@nestjs/common';
import { CACHE_PORT, type CachePort } from './infrastructure/ports/cache.port';
import { PrismaService } from './prisma/prisma.service';

export type Dashboard = { candidates: number; verified: number; batches: number; placements: number; certificates: number; enrollments: number; complaints: number; serviceBookings: number };

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService, @Inject(CACHE_PORT) private readonly cache: CachePort) {}

  async get(tenantId: string) {
    const key = `tenant:${tenantId}:dashboard`;
    try {
      const cached = await this.cache.get(key);
      if (cached) return JSON.parse(cached) as Dashboard;
    } catch { /* PostgreSQL remains the source of truth when cache is unavailable. */ }
    const [candidates, verified, batches, placements, certificates, enrollments, complaints, serviceBookings] = await Promise.all([
      this.prisma.candidate.count({ where: { tenantId } }),
      this.prisma.candidate.count({ where: { tenantId, status: 'VERIFIED' } }),
      this.prisma.batch.count({ where: { tenantId } }),
      this.prisma.placement.count({ where: { tenantId } }),
      this.prisma.certificate.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.enrollment.count({ where: { tenantId } }),
      this.prisma.complaint.count({ where: { tenantId } }),
      this.prisma.serviceBooking.count({ where: { tenantId } }),
    ]);
    const dashboard: Dashboard = { candidates, verified, batches, placements, certificates, enrollments, complaints, serviceBookings };
    try { await this.cache.set(key, JSON.stringify(dashboard), 45); } catch { /* Cache is an optimization, never a request dependency. */ }
    return dashboard;
  }
}
