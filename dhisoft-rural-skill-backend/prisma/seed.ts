import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const p = new PrismaClient();

async function main() {
  const seedPassword = process.env.SEED_PASSWORD;
  if (!seedPassword) throw new Error('SEED_PASSWORD must be set in the backend .env before seeding.');

  await p.courseSubscription.deleteMany();
  await p.payout.deleteMany();
  await p.payment.deleteMany();
  await p.complaint.deleteMany();
  await p.serviceBooking.deleteMany();
  await p.serviceOpportunity.deleteMany();
  await p.serviceArea.deleteMany();
  await p.document.deleteMany();
  await p.evidenceFile.deleteMany();
  await p.evaluation.deleteMany();
  await p.practicalAssignment.deleteMany();
  await p.attendanceRecord.deleteMany();
  await p.timetable.deleteMany();
  await p.assessmentResult.deleteMany();
  await p.assessment.deleteMany();
  await p.interviewScorecard.deleteMany();
  await p.interview.deleteMany();
  await p.employmentOffer.deleteMany();
  await p.apprenticeship.deleteMany();
  await p.tradeRecommendation.deleteMany();
  await p.candidateTradeChoice.deleteMany();
  await p.counsellingSession.deleteMany();
  await p.refreshToken.deleteMany();
  await p.authSession.deleteMany();
  await p.passwordResetToken.deleteMany();
  await p.invitation.deleteMany();
  await p.auditEvent.deleteMany();
  await p.incomeRecord.deleteMany();
  await p.retentionFollowUp.deleteMany();
  await p.placement.deleteMany();
  await p.jobApplication.deleteMany();
  await p.vacancy.deleteMany();
  await p.employer.deleteMany();
  await p.certificate.deleteMany();
  await p.enrollment.deleteMany();
  await p.batch.deleteMany();
  await p.trainingCentre.deleteMany();
  await p.curriculumVersion.deleteMany();
  await p.course.deleteMany();
  await p.trade.deleteMany();
  await p.trainerProfile.deleteMany();
  await p.trainingPartner.deleteMany();
  await p.consent.deleteMany();
  await p.candidate.deleteMany();
  await p.user.deleteMany();
  await p.tenant.deleteMany();

  const pilot = await p.tenant.create({ data: { slug: 'rural-pilot', name: 'DHISOFT Rural Pilot Telangana' } });
  const second = await p.tenant.create({ data: { slug: 'second-tenant', name: 'Isolation Test Tenant' } });
  const hash = await argon2.hash(seedPassword);
  for (const [email, role] of [['owner@rural-pilot.local', 'TENANT_OWNER'], ['programme@rural-pilot.local', 'PROGRAMME_MANAGER'], ['coordinator@rural-pilot.local', 'FIELD_COORDINATOR'], ['trainer@rural-pilot.local', 'TRAINER'], ['assessor@rural-pilot.local', 'ASSESSOR'], ['employer@rural-pilot.local', 'EMPLOYER_ADMIN'], ['finance@rural-pilot.local', 'FINANCE_USER']]) {
    await p.user.create({ data: { tenantId: pilot.id, email, passwordHash: hash, role } });
  }
  await p.user.create({ data: { tenantId: second.id, email: 'owner@second.local', passwordHash: hash, role: 'TENANT_OWNER' } });

  const ac = await p.trade.create({ data: { tenantId: pilot.id, name: 'AC and refrigeration technician', code: 'ACR', hazardClass: 'HIGH' } });
  const el = await p.trade.create({ data: { tenantId: pilot.id, name: 'Electrician assistant', code: 'ELEC', hazardClass: 'HIGH' } });
  await p.trade.create({ data: { tenantId: pilot.id, name: 'Solar assistant', code: 'SOLAR', hazardClass: 'MEDIUM' } });
  const course = await p.course.create({ data: { tenantId: pilot.id, tradeId: ac.id, code: 'ACR-101', title: 'AC and Refrigeration Technician Foundation', status: 'PUBLISHED', durationDays: 90, theoryHours: 120, practicalHours: 240, language: 'en', youtubeUrl: 'https://www.youtube.com/watch?v=l7LLRP9ROBQ', lessonTitle: 'కార్పెంటర్ టూల్స్  carpentry tools #carpentrytools #tools', lessonAuthor: 'wood work Telugu', lessonAuthorUrl: 'https://www.youtube.com/@WOODWORKTELUGU', lessonThumbnailUrl: 'https://i.ytimg.com/vi/l7LLRP9ROBQ/hqdefault.jpg', subscriptionRequired: true } });
  const cv = await p.curriculumVersion.create({ data: { tenantId: pilot.id, courseId: course.id, version: 1, status: 'PUBLISHED', content: { modules: [{ title: 'Safety and tools' }, { title: 'Refrigeration cycle' }, { title: 'Installation and service' }] } } });
  const centre = await p.trainingCentre.create({ data: { tenantId: pilot.id, name: 'Rural Skills Training Centre', district: 'Rangareddy', capacity: 40, status: 'APPROVED' } });
  const batch = await p.batch.create({ data: { tenantId: pilot.id, courseId: course.id, curriculumVersionId: cv.id, centreId: centre.id, name: 'ACR Pilot Batch 2026', startDate: new Date('2026-08-10'), endDate: new Date('2026-11-10'), capacity: 30, status: 'ENROLMENT_OPEN' } });

  for (let i = 1; i <= 30; i += 1) {
    const isAc = i <= 15;
    const candidate = await p.candidate.create({ data: { tenantId: pilot.id, fullName: isAc ? `AC Candidate ${i}` : `Electrical Candidate ${i}`, dateOfBirth: new Date(`199${i % 8}-0${(i % 9) + 1}-10`), mobile: `900000${String(i).padStart(4, '0')}`, preferredLanguage: i % 2 ? 'te' : 'en', tradeInterests: [isAc ? 'AC and refrigeration' : 'Electrical and solar'], status: i < 25 ? 'VERIFIED' : 'SUBMITTED', district: 'Rangareddy', village: `Pilot Village ${i % 5 + 1}`, adultEligible: true } });
    await p.consent.create({ data: { tenantId: pilot.id, candidateId: candidate.id, type: 'REGISTRATION', version: '1.0', granted: true, channel: 'assisted' } });
    if (i <= 15) await p.enrollment.create({ data: { tenantId: pilot.id, candidateId: candidate.id, batchId: batch.id, theoryAttendance: 85, practicalAttendance: 90, assignmentPassed: i <= 10, theoryPassed: i <= 10, practicalPassed: i <= 10 } });
  }

  const employer = await p.employer.create({ data: { tenantId: pilot.id, name: 'Telangana Cooling Services', status: 'VERIFIED', district: 'Rangareddy' } });
  await p.vacancy.create({ data: { tenantId: pilot.id, employerId: employer.id, tradeId: ac.id, title: 'Junior AC Service Technician', openings: 8, salaryMin: 16000, salaryMax: 22000, location: 'Hyderabad', risks: 'Electrical and refrigerant handling', status: 'PUBLISHED' } });
  await p.trade.create({ data: { tenantId: second.id, name: 'Isolation Trade', code: 'ISO', hazardClass: 'LOW' } });
  console.log('Seed complete');
}

main().finally(() => p.$disconnect());
