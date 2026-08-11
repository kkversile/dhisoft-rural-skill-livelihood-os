import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'node:crypto';

type Query = { page?: number; pageSize?: number; search?: string; status?: string; sort?: string; direction?: 'asc' | 'desc' };
type Data = Record<string, unknown>;

const resources: Record<string, string> = { consents: 'consent', counselling: 'counsellingSession', recommendations: 'tradeRecommendation', choices: 'candidateTradeChoice', trades: 'trade', courses: 'course', curricula: 'curriculumVersion', partners: 'trainingPartner', trainers: 'trainerProfile', centres: 'trainingCentre', batches: 'batch', enrollments: 'enrollment', timetables: 'timetable', attendance: 'attendanceRecord', assignments: 'practicalAssignment', evidence: 'evidenceFile', evaluations: 'evaluation', assessments: 'assessment', results: 'assessmentResult', certificates: 'certificate', apprenticeships: 'apprenticeship', employers: 'employer', vacancies: 'vacancy', applications: 'jobApplication', interviews: 'interview', scorecards: 'interviewScorecard', offers: 'employmentOffer', placements: 'placement', retention: 'retentionFollowUp', earnings: 'incomeRecord', serviceAreas: 'serviceArea', serviceOpportunities: 'serviceOpportunity', serviceBookings: 'serviceBooking', complaints: 'complaint', payments: 'payment', payouts: 'payout', documents: 'document', audit: 'auditEvent' };
const labels: Record<string, string> = Object.fromEntries(Object.keys(resources).map((key) => [key, key]));
const searchFields: Record<string, string[]> = { trade: ['name', 'code', 'hazardClass'], course: ['code', 'title', 'status', 'language'], curriculumVersion: ['status'], trainingPartner: ['name', 'registrationNumber', 'status'], trainerProfile: ['name', 'phone', 'status'], trainingCentre: ['name', 'district', 'status'], batch: ['name', 'status'], enrollment: ['status'], timetable: ['sessionType', 'topic', 'status'], attendanceRecord: ['sessionType', 'status', 'reason'], practicalAssignment: ['title', 'instructions', 'status'], evidenceFile: ['originalName', 'mimeType', 'status'], evaluation: ['feedback'], assessment: ['name', 'assessmentType', 'status'], assessmentResult: [], certificate: ['number', 'status', 'revokedReason'], counsellingSession: ['interests', 'aptitude', 'locationPreference', 'notes', 'status'], tradeRecommendation: ['explanation', 'status'], candidateTradeChoice: ['status'], employer: ['name', 'district', 'status'], vacancy: ['title', 'location', 'risks', 'status'], jobApplication: ['status'], interview: ['mode', 'status'], interviewScorecard: ['recommendation', 'notes'], employmentOffer: ['status'], apprenticeship: ['providerName', 'status'], placement: ['status'], retentionFollowUp: ['status', 'notes'], incomeRecord: ['source'], serviceArea: ['name', 'district', 'status'], serviceOpportunity: ['title', 'description', 'status'], serviceBooking: ['customerName', 'customerMobile', 'serviceAddress', 'status'], complaint: ['category', 'description', 'severity', 'status'], payment: ['provider', 'providerReference', 'status'], payout: ['status', 'idempotencyKey'], document: ['type', 'originalName', 'mimeType', 'status'], auditEvent: ['action', 'entity', 'reason'] };
const sortable: Record<string, string[]> = { trade: ['name', 'code'], course: ['title', 'code'], curriculumVersion: ['version'], trainingPartner: ['name'], trainerProfile: ['name'], trainingCentre: ['name'], batch: ['startDate', 'name'], enrollment: ['id'], timetable: ['sessionDate'], attendanceRecord: ['attendanceDate'], practicalAssignment: ['dueDate'], evidenceFile: ['createdAt'], evaluation: ['evaluatedAt'], assessment: ['scheduledAt', 'name'], assessmentResult: ['recordedAt'], certificate: ['issueDate', 'number'], counsellingSession: ['sessionDate'], tradeRecommendation: ['score', 'createdAt'], candidateTradeChoice: ['selectedAt'], employer: ['name'], vacancy: ['title'], jobApplication: ['id'], interview: ['scheduledAt'], interviewScorecard: ['createdAt'], employmentOffer: ['issuedAt'], apprenticeship: ['startDate'], placement: ['joiningDate'], retentionFollowUp: ['dueDate'], incomeRecord: ['month'], serviceArea: ['name'], serviceOpportunity: ['title'], serviceBooking: ['scheduledAt'], complaint: ['createdAt'], payment: ['createdAt'], payout: ['processedAt'], document: ['createdAt'], auditEvent: ['createdAt'] };
const statusModels = new Set(['course', 'curriculumVersion', 'trainingPartner', 'trainerProfile', 'trainingCentre', 'batch', 'enrollment', 'timetable', 'attendanceRecord', 'practicalAssignment', 'evidenceFile', 'assessment', 'certificate', 'counsellingSession', 'tradeRecommendation', 'candidateTradeChoice', 'employer', 'vacancy', 'jobApplication', 'interview', 'employmentOffer', 'apprenticeship', 'placement', 'retentionFollowUp', 'serviceArea', 'serviceOpportunity', 'serviceBooking', 'complaint', 'payment', 'payout', 'document']);
const blocked = new Set(['id', 'tenantId', 'createdAt', 'updatedAt', 'version', 'tokenHash', 'storageKey']);
const referenceModels: Record<string, string> = { candidateId: 'candidate', batchId: 'batch', enrollmentId: 'enrollment', timetableId: 'timetable', assignmentId: 'practicalAssignment', assessmentId: 'assessment', tradeId: 'trade', courseId: 'course', curriculumVersionId: 'curriculumVersion', centreId: 'trainingCentre', employerId: 'employer', vacancyId: 'vacancy', applicationId: 'jobApplication', interviewId: 'interview', placementId: 'placement', serviceAreaId: 'serviceArea', opportunityId: 'serviceOpportunity', serviceBookingId: 'serviceBooking', paymentId: 'payment', recommendationId: 'tradeRecommendation', trainingPartnerId: 'trainingPartner' };

@Injectable()
export class WorkflowService {
  constructor(private p: PrismaService) {}

  private model(resource: string) {
    const modelName = resources[resource];
    if (!modelName) throw new NotFoundException(`Unknown workflow resource: ${resource}`);
    return (this.p as unknown as Record<string, any>)[modelName];
  }

  private youtubeEmbedUrl(value: unknown) {
    if (typeof value !== 'string' || value.length > 500) return null;
    try {
      const url = new URL(value);
      const host = url.hostname.toLowerCase();
      let videoId = '';
      if (host === 'youtu.be') videoId = url.pathname.slice(1).split('/')[0];
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
        if (url.pathname === '/watch') videoId = url.searchParams.get('v') || '';
        if (url.pathname.startsWith('/embed/')) videoId = url.pathname.split('/')[2] || '';
        if (url.pathname.startsWith('/shorts/')) videoId = url.pathname.split('/')[2] || '';
      }
      if (!/^[-_A-Za-z0-9]{6,20}$/.test(videoId)) return null;
      return `https://www.youtube-nocookie.com/embed/${videoId}`;
    } catch {
      return null;
    }
  }

  private validateCourseData(resource: string, data: Data) {
    if (resource !== 'courses' || data.youtubeUrl === undefined || data.youtubeUrl === null || data.youtubeUrl === '') return;
    if (!this.youtubeEmbedUrl(data.youtubeUrl)) throw new BadRequestException('youtubeUrl must be a valid YouTube watch, embed, shorts or youtu.be URL.');
  }

  private async extractLessonMetadata(youtubeUrl: unknown): Promise<Data> {
    if (!this.youtubeEmbedUrl(youtubeUrl) || typeof youtubeUrl !== 'string') return {};
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeUrl)}&format=json`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return {};
      const metadata = await response.json() as { title?: string; author_name?: string; author_url?: string; thumbnail_url?: string };
      return {
        lessonTitle: metadata.title?.slice(0, 500) || null,
        lessonAuthor: metadata.author_name?.slice(0, 200) || null,
        lessonAuthorUrl: metadata.author_url?.slice(0, 500) || null,
        lessonThumbnailUrl: metadata.thumbnail_url?.slice(0, 500) || null,
      };
    } catch {
      return {};
    }
  }

  private async isSubscribed(tenantId: string, userId: string, courseId: string) {
    const subscription = await this.p.courseSubscription.findUnique({ where: { tenantId_courseId_userId: { tenantId, courseId, userId } } });
    return subscription?.status === 'ACTIVE';
  }

  private async sanitizeCourse(tenantId: string, userId: string, item: Data) {
    if (!item || resources.courses !== 'course') return item;
    const youtubeUrl = typeof item.youtubeUrl === 'string' ? item.youtubeUrl : null;
    const subscriptionRequired = item.subscriptionRequired !== false;
    const subscribed = await this.isSubscribed(tenantId, userId, String(item.id));
    const accessGranted = Boolean(youtubeUrl) && (!subscriptionRequired || subscribed);
    return { ...item, youtubeUrl: accessGranted ? youtubeUrl : null, videoAvailable: Boolean(youtubeUrl), accessGranted, subscribed };
  }

  async list(tenantId: string, userId: string, resource: string, q: Query) {
    const modelName = resources[resource];
    const model = this.model(resource);
    const page = Math.max(1, q.page || 1);
    const pageSize = Math.min(100, Math.max(1, q.pageSize || 20));
    const where: Data = { tenantId };
    if (q.status && statusModels.has(modelName)) where.status = q.status;
    const search = q.search?.trim();
    const fields = searchFields[modelName] || [];
    if (search && fields.length) where.OR = fields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
    const requested = q.sort;
    const orderField = requested && sortable[modelName]?.includes(requested) ? requested : 'id';
    const [rawData, total] = await this.p.$transaction([
      model.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { [orderField]: q.direction === 'asc' ? 'asc' : 'desc' } }),
      model.count({ where }),
    ]);
    const data = modelName === 'course' ? await Promise.all(rawData.map((item: Data) => this.sanitizeCourse(tenantId, userId, item))) : rawData;
    return { data, meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), resource: labels[resource] } };
  }

  async get(tenantId: string, userId: string, resource: string, id: string) {
    const model = this.model(resource);
    const item = await model.findFirst({ where: { id, tenantId } });
    if (!item) throw new NotFoundException();
    return resources[resource] === 'course' ? this.sanitizeCourse(tenantId, userId, item) : item;
  }

  private async assertReferences(tenantId: string, data: Data) {
    for (const [key, modelName] of Object.entries(referenceModels)) {
      const id = data[key];
      if (typeof id !== 'string') continue;
      const model = (this.p as unknown as Record<string, any>)[modelName];
      if (!model) continue;
      const row = await model.findFirst({ where: { id, tenantId } });
      if (!row) throw new ForbiddenException(`Cross-tenant or missing reference: ${key}`);
    }
  }

  async create(tenantId: string, userId: string, resource: string, input: WorkflowDataDtoLike) {
    const model = this.model(resource);
    const data: Data = { ...input.data };
    for (const key of Object.keys(data)) if (blocked.has(key)) delete data[key];
    data.tenantId = tenantId;
    if (input.status) data.status = input.status;
    this.validateCourseData(resource, data);
    if (resource === 'courses' && data.youtubeUrl) Object.assign(data, await this.extractLessonMetadata(data.youtubeUrl));
    await this.assertReferences(tenantId, data);
    if (resource === 'enrollments') {
      const candidate = await this.p.candidate.findFirst({ where: { id: String(data.candidateId), tenantId } });
      const batch = await this.p.batch.findFirst({ where: { id: String(data.batchId), tenantId } });
      if (!candidate || candidate.status !== 'VERIFIED') throw new BadRequestException('Only verified adult candidates can enrol.');
      if (!batch) throw new BadRequestException('Batch not found.');
      const count = await this.p.enrollment.count({ where: { batchId: batch.id } });
      if (count >= batch.capacity) throw new BadRequestException('Batch capacity is full.');
    }
    const created = await model.create({ data });
    await this.audit(tenantId, userId, 'workflow.create', resource, created.id, created);
    return resources[resource] === 'course' ? this.sanitizeCourse(tenantId, userId, created) : created;
  }

  async update(tenantId: string, userId: string, resource: string, id: string, input: WorkflowDataDtoLike) {
    const model = this.model(resource);
    await this.get(tenantId, userId, resource, id);
    const data: Data = { ...input.data };
    for (const key of Object.keys(data)) if (blocked.has(key)) delete data[key];
    if (input.status) data.status = input.status;
    this.validateCourseData(resource, data);
    if (resource === 'courses' && data.youtubeUrl) Object.assign(data, await this.extractLessonMetadata(data.youtubeUrl));
    if (resource === 'courses' && data.youtubeUrl === null) Object.assign(data, { lessonTitle: null, lessonAuthor: null, lessonAuthorUrl: null, lessonThumbnailUrl: null });
    await this.assertReferences(tenantId, data);
    const updated = await model.update({ where: { id }, data });
    await this.audit(tenantId, userId, 'workflow.update', resource, id, updated);
    return resources[resource] === 'course' ? this.sanitizeCourse(tenantId, userId, updated) : updated;
  }

  async courseAccess(tenantId: string, userId: string, courseId: string) {
    const course = await this.p.course.findFirst({ where: { id: courseId, tenantId }, select: { id: true, title: true, youtubeUrl: true, subscriptionRequired: true, lessonTitle: true, lessonAuthor: true, lessonAuthorUrl: true, lessonThumbnailUrl: true } });
    if (!course) throw new NotFoundException('Course not found.');
    const subscribed = await this.isSubscribed(tenantId, userId, courseId);
    const embedUrl = this.youtubeEmbedUrl(course.youtubeUrl);
    const accessGranted = Boolean(embedUrl) && (!course.subscriptionRequired || subscribed);
    return { courseId: course.id, title: course.title, lessonTitle: course.lessonTitle, lessonAuthor: course.lessonAuthor, lessonAuthorUrl: course.lessonAuthorUrl, lessonThumbnailUrl: course.lessonThumbnailUrl, videoAvailable: Boolean(embedUrl), subscriptionRequired: course.subscriptionRequired, subscribed, accessGranted, embedUrl: accessGranted ? embedUrl : null };
  }

  async subscribeToCourse(tenantId: string, userId: string, courseId: string) {
    const course = await this.p.course.findFirst({ where: { id: courseId, tenantId } });
    if (!course) throw new NotFoundException('Course not found.');
    await this.p.courseSubscription.upsert({
      where: { tenantId_courseId_userId: { tenantId, courseId, userId } },
      create: { tenantId, courseId, userId, status: 'ACTIVE' },
      update: { status: 'ACTIVE', cancelledAt: null, subscribedAt: new Date() },
    });
    await this.audit(tenantId, userId, 'course.subscribe', 'Course', courseId, { courseId, userId });
    return this.courseAccess(tenantId, userId, courseId);
  }

  async recommend(tenantId: string, userId: string, candidateId: string) {
    const candidate = await this.p.candidate.findFirst({ where: { id: candidateId, tenantId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    const trades = await this.p.trade.findMany({ where: { tenantId, active: true } });
    const made = [];
    for (const trade of trades) {
      const text = [candidate.tradeInterests.join(' '), candidate.education || '', candidate.experience || '', candidate.district || ''].join(' ').toLowerCase();
      const interest = text.includes(trade.name.toLowerCase()) || text.includes(trade.code.toLowerCase()) ? 60 : 20;
      const demand = await this.p.vacancy.count({ where: { tenantId, tradeId: trade.id, status: 'PUBLISHED' } });
      const score = Math.min(100, interest + Math.min(30, demand * 5));
      const factors = { interest: interest === 60 ? 1 : 0, demand, education: candidate.education ? 1 : 0, location: candidate.district ? 1 : 0 };
      const explanation = `Score ${score}/100: ${interest === 60 ? 'matches stated interests' : 'general fit'}; ${demand} published employer demand signal(s); ${candidate.district ? 'location captured' : 'location not yet captured'}.`;
      made.push(await this.p.tradeRecommendation.create({ data: { tenantId, candidateId, tradeId: trade.id, score, factors, explanation } }));
    }
    await this.audit(tenantId, userId, 'recommendations.generate', 'Candidate', candidateId, made.map((item) => item.id));
    return made.sort((a, b) => Number(b.score) - Number(a.score));
  }

  async report(tenantId: string) {
    const [candidates, verified, enrolled, certificates, placements, earnings, complaints, bookings] = await Promise.all([
      this.p.candidate.count({ where: { tenantId } }), this.p.candidate.count({ where: { tenantId, status: 'VERIFIED' } }), this.p.enrollment.count({ where: { tenantId } }), this.p.certificate.count({ where: { tenantId, status: 'ACTIVE' } }), this.p.placement.count({ where: { tenantId } }), this.p.incomeRecord.aggregate({ where: { tenantId }, _sum: { net: true } }), this.p.complaint.count({ where: { tenantId } }), this.p.serviceBooking.count({ where: { tenantId } }),
    ]);
    return { candidates, verified, enrolled, certificates, placements, netIncome: earnings._sum.net || 0, complaints, serviceBookings: bookings };
  }

  private audit(tenantId: string, userId: string, action: string, entity: string, entityId: string, newValue: unknown) {
    return this.p.auditEvent.create({ data: { tenantId, userId, action, entity, entityId, newValue: newValue as object, correlationId: randomUUID() } });
  }
}

type WorkflowDataDtoLike = { data: Data; status?: string };
