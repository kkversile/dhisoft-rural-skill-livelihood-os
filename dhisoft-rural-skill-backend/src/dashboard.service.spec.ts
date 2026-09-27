import { DashboardService } from './dashboard.service';

class FakeCache {
  values = new Map<string, string>();
  ttls: Array<{ key: string; seconds?: number }> = [];
  async get(key: string) { return this.values.get(key) || null; }
  async set(key: string, value: string, seconds?: number) { this.values.set(key, value); this.ttls.push({ key, seconds }); }
  async delete(key: string) { this.values.delete(key); }
  async health() { return { status: 'ok' as const, provider: 'test' }; }
}

describe('DashboardService', () => {
  it('uses tenant-scoped cache miss, hit and 45-second TTL', async () => {
    let databaseReads = 0;
    const count = async () => { databaseReads += 1; return databaseReads; };
    const prisma = { candidate: { count }, batch: { count }, placement: { count }, certificate: { count }, enrollment: { count }, complaint: { count }, serviceBooking: { count } };
    const cache = new FakeCache();
    const service = new DashboardService(prisma as never, cache as never);
    const first = await service.get('tenant-a');
    const second = await service.get('tenant-a');
    expect(second).toEqual(first);
    expect(databaseReads).toBe(8);
    expect(cache.ttls).toEqual([{ key: 'tenant:tenant-a:dashboard', seconds: 45 }]);
    await service.get('tenant-b');
    expect(cache.values.has('tenant:tenant-b:dashboard')).toBe(true);
    expect(cache.values.get('tenant:tenant-a:dashboard')).not.toBe(cache.values.get('tenant:tenant-b:dashboard'));
  });
});
