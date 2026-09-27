import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../events/outbox.service';
import { CreateCandidateDto } from './dto';

@Injectable()
export class CandidatesService {
  constructor(private readonly p: PrismaService, private readonly outbox: OutboxService) {}

  async list(tenantId: string, page = 1, pageSize = 20, search = '') {
    const where = { tenantId, ...(search ? { OR: [{ fullName: { contains: search, mode: 'insensitive' as const } }, { mobile: { contains: search } }] } : {}) };
    const [data, total] = await this.p.$transaction([this.p.candidate.findMany({ where, skip: (page - 1) * pageSize, take: Math.min(pageSize, 100), orderBy: { createdAt: 'desc' } }), this.p.candidate.count({ where })]);
    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async create(tenantId: string, userId: string, d: CreateCandidateDto) {
    const dob = new Date(d.dateOfBirth);
    const adult = new Date().getUTCFullYear() - dob.getUTCFullYear() >= 18;
    if (!adult) throw new BadRequestException('Candidate must be at least 18 for the adult pilot.');
    if (await this.p.candidate.findFirst({ where: { tenantId, mobile: d.mobile } })) throw new BadRequestException('A candidate with this mobile already exists; use duplicate review instead of merging automatically.');
    const correlationId = randomUUID();
    return this.p.$transaction(async (tx) => {
      const created = await tx.candidate.create({ data: { tenantId, ...d, dateOfBirth: dob, adultEligible: true, status: 'SUBMITTED' } });
      await tx.consent.create({ data: { tenantId, candidateId: created.id, type: 'REGISTRATION', version: '1.0', granted: true, channel: 'assisted' } });
      await tx.auditEvent.create({ data: { tenantId, userId, action: 'candidate.create', entity: 'Candidate', entityId: created.id, newValue: created as object, correlationId } });
      await this.outbox.enqueue(tx, { tenantId, eventType: 'candidate.registered', aggregateType: 'Candidate', aggregateId: created.id, correlationId, data: { candidateId: created.id, status: created.status, preferredLanguage: created.preferredLanguage } });
      return created;
    });
  }

  async get(tenantId: string, id: string) {
    const c = await this.p.candidate.findFirst({ where: { id, tenantId }, include: { consents: true, enrollments: true, applications: true, placements: true, incomeRecords: true } });
    if (!c) throw new NotFoundException();
    return c;
  }

  async verify(tenantId: string, userId: string, id: string) {
    await this.get(tenantId, id);
    const correlationId = randomUUID();
    return this.p.$transaction(async (tx) => {
      const c = await tx.candidate.update({ where: { id }, data: { status: 'VERIFIED', version: { increment: 1 } } });
      await tx.auditEvent.create({ data: { tenantId, userId, action: 'candidate.verify', entity: 'Candidate', entityId: id, newValue: c as object, correlationId } });
      await this.outbox.enqueue(tx, { tenantId, eventType: 'candidate.verified', aggregateType: 'Candidate', aggregateId: id, correlationId, data: { candidateId: id, status: c.status } });
      return c;
    });
  }
}
