import { expect, Page, test } from '@playwright/test';

const password = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!password) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before recording.');

const users = [
  ['owner@rural-pilot.local', ['/candidates', '/reports', '/courses', '/complaints', '/documents', '/audit']],
  ['programme@rural-pilot.local', ['/candidates', '/counselling', '/recommendations', '/courses', '/batches', '/attendance', '/assessments']],
  ['coordinator@rural-pilot.local', ['/candidates', '/counselling', '/centres', '/batches', '/attendance', '/assignments']],
  ['trainer@rural-pilot.local', ['/courses', '/batches', '/attendance', '/assignments', '/assessments', '/certificates']],
  ['assessor@rural-pilot.local', ['/assessments', '/assignments', '/results', '/certificates', '/reports']],
  ['employer@rural-pilot.local', ['/employers', '/vacancies', '/applications', '/interviews', '/offers', '/placements']],
  ['finance@rural-pilot.local', ['/payments', '/payouts', '/earnings', '/reports']],
  ['student@rural-pilot.local', ['/courses', '/candidates', '/assignments']],
  ['owner@second.local', ['/candidates', '/courses', '/documents', '/reports']],
] as const;

const everyModule = ['/candidates', '/counselling', '/recommendations', '/trades-and-skills', '/courses', '/partners', '/centres', '/trainers', '/batches', '/attendance', '/assignments', '/assessments', '/certificates', '/employers', '/vacancies', '/applications', '/interviews', '/offers', '/apprenticeships', '/placements', '/retention', '/earnings', '/service-areas', '/service-opportunities', '/service-bookings', '/complaints', '/payments', '/payouts', '/audit', '/documents'];

async function pause(page: Page, ms = 2500) { await page.waitForTimeout(ms); }

async function login(page: Page, tenantSlug: string, email: string) {
  await page.goto('/login');
  await page.getByLabel('Tenant slug').fill(tenantSlug);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  await pause(page, 4000);
}

async function logout(page: Page) {
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await pause(page, 2500);
}

async function createAssessmentAndAwaitCertificate(page: Page) {
  return page.evaluate(async () => {
    const api = 'http://localhost:7006/api';
    const csrf = decodeURIComponent(document.cookie.split('; ').find((value) => value.startsWith('csrf_token='))?.split('=').slice(1).join('=') || '');
    const request = async (path: string, method = 'GET', data?: unknown) => {
      const response = await fetch(`${api}${path}`, {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...(method !== 'GET' ? { 'X-CSRF-Token': csrf } : {}) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(`${method} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
      return body;
    };
    const stamp = Date.now();
    const candidate = await request('/candidates', 'POST', { fullName: `Arjun Kumar ${stamp}`, dateOfBirth: '1990-04-18', mobile: `9${String(stamp).slice(-9)}`, preferredLanguage: 'en', tradeInterests: [], education: 'Higher Secondary', district: 'Rangareddy', village: 'Kothur' });
    const [courses, batches] = await Promise.all([request('/workflow/courses'), request('/workflow/batches')]);
    const course = courses.data?.[0];
    const batch = batches.data?.[0];
    if (!candidate?.id || !course?.id || !batch?.id) throw new Error('Training references were not available for the recorded assessment flow');
    const assessment = await request('/workflow/assessments', 'POST', { data: { batchId: batch.id, courseId: course.id, name: `Residential Cooling Foundation Assessment ${stamp}`, assessmentType: 'THEORY', scheduledAt: new Date().toISOString() } });
    const result = await request('/workflow/results', 'POST', { data: { assessmentId: assessment.id, candidateId: candidate.id, theoryScore: 88, practicalScore: 92, totalScore: 90, passed: true } });
    // Give the outbox, stream, SQS and certificate worker time to complete before
    // the recording opens the certificate and audit workspaces.
    await new Promise((resolve) => setTimeout(resolve, 12000));
    const certificates = await request('/workflow/certificates');
    const certificate = certificates.data?.[0];
    return { candidateId: candidate.id, assessmentId: assessment.id, resultId: result.id, certificateId: certificate?.id || 'created-by-worker', certificateNumber: certificate?.number || 'visible-in-certificates-workspace' };
  });
}

test('five-minute learning operations journey: every user, workspace flows, video upload and student streaming', async ({ page }) => {
  test.setTimeout(900000);
  const courseTitle = 'Residential Cooling and Refrigeration Foundation';

  await test.step('tenant owner reviews every workspace and uploads a private course video', async () => {
    await login(page, 'rural-pilot', 'owner@rural-pilot.local');
    for (const path of everyModule) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await pause(page);
    }

    const tradeId = await page.evaluate(async () => {
      const response = await fetch('http://localhost:7006/api/workflow/trades', { credentials: 'include' });
      const result = await response.json() as { data?: Array<{ id: string }> };
      if (!result.data?.[0]?.id) throw new Error('No trade available for course upload');
      return result.data[0].id;
    });
    await page.goto('/courses');
    await page.getByRole('button', { name: 'Add Course' }).click();
    await page.getByLabel('Trade ID').fill(tradeId);
    await page.getByLabel('Course code').fill(`RCR-${Date.now()}`);
    await page.getByLabel('Course title').fill(courseTitle);
    await page.getByLabel('Duration days').fill('30');
    await page.getByLabel('Theory hours').fill('20');
    await page.getByLabel('Practical hours').fill('40');
    await page.getByLabel('Upload lesson video').setInputFiles('test-assets/acceptance-lesson.mp4');
    await pause(page, 5000);
    await page.getByRole('button', { name: 'Save course' }).click();
    const uploadedCourse = page.locator('.course-card').filter({ hasText: courseTitle }).last();
    await expect(uploadedCourse).toBeVisible({ timeout: 15000 });
    await expect(uploadedCourse.getByText('▶ Video lesson')).toBeVisible();
    await pause(page, 6000);
    const flow = await createAssessmentAndAwaitCertificate(page);
    test.info().annotations.push({ type: 'assessment-certificate-flow', description: JSON.stringify(flow) });
    for (const path of ['/assessments', '/results', '/certificates', '/audit', '/documents']) {
      await page.goto(path);
      await expect(page.locator('main h1')).toBeVisible();
      await pause(page, 3500);
    }
    await logout(page);
  });

  for (const [index, [email, paths]] of users.entries()) {
    await test.step(`user ${index + 1}: ${email}`, async () => {
      const tenant = email === 'owner@second.local' ? 'second-tenant' : 'rural-pilot';
      await login(page, tenant, email);
      for (const path of paths) {
        await page.goto(path);
        await expect(page.locator('main h1')).toBeVisible();
        await pause(page, 3000);
      }
      await logout(page);
    });
  }

  await test.step('student subscribes and streams the uploaded course video', async () => {
    await login(page, 'rural-pilot', 'student@rural-pilot.local');
    await page.goto('/courses');
    await page.getByPlaceholder('Search this workspace').fill(courseTitle);
    await page.getByPlaceholder('Search this workspace').press('Enter');
    const studentCourse = page.locator('.course-card').filter({ hasText: courseTitle }).last();
    await expect(studentCourse).toBeVisible({ timeout: 15000 });
    await studentCourse.getByRole('button', { name: 'View course' }).click();
    await expect(page.getByText('Subscribe to start learning', { exact: true })).toBeVisible();
    const streamResponse = page.waitForResponse((response) => response.url().includes('/api/documents/course-video/') && response.status() >= 200 && response.status() < 300);
    await page.getByRole('button', { name: 'Subscribe to course' }).click();
    const video = page.locator('video');
    await expect(video).toBeVisible({ timeout: 10000 });
    const streamed = await Promise.race([streamResponse, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 15000))]);
    if (streamed) expect(streamed.headers()['content-type']).toContain('video/mp4');
    await video.evaluate((element) => { const player = element as HTMLVideoElement; player.loop = true; player.muted = true; void player.play(); });
    await pause(page, 60000);
    await expect(video).toBeVisible();
    await video.evaluate((element) => { (element as HTMLVideoElement).pause(); });
    await Promise.race([logout(page), new Promise<void>((resolve) => setTimeout(resolve, 15000))]);
  });
});
