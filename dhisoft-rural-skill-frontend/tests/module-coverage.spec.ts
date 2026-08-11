import { expect, Page, test } from '@playwright/test';

const apiBase = 'http://localhost:7006/api';
const loginPassword = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!loginPassword) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before running Playwright.');

async function login(page: Page): Promise<string> {
  await page.goto('/login');
  await page.getByLabel('Tenant slug').fill('rural-pilot');
  await page.getByLabel('Email').fill('owner@rural-pilot.local');
  await page.getByLabel('Password').fill(loginPassword);
  const loginResponse = page.waitForResponse((response) => response.url() === `${apiBase}/auth/login` && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign in' }).click();
  const loginBody = await (await loginResponse).json() as { user: { id: string } };
  await expect(page).toHaveURL(/\/$/);
  return loginBody.user.id;
}

async function firstId(page: Page, path: string): Promise<string> {
  return page.evaluate(async (endpoint) => {
    const response = await fetch(`${'http://localhost:7006/api'}${endpoint}`, { credentials: 'include' });
    const result = await response.json() as { data?: Array<{ id: string }> };
    if (!result.data?.[0]?.id) throw new Error(`No seeded record found for ${endpoint}`);
    return result.data[0].id;
  }, path);
}

async function createRecord(page: Page, path: string, button: RegExp, fields: Record<string, string>, visibleText: string): Promise<string> {
  await page.goto(path);
  await expect(page.locator('main h1')).toBeVisible();
  await page.getByRole('button', { name: button }).click();
  for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: true }).fill(value);
  const createResponse = page.waitForResponse((response) => response.url().includes('/api/workflow/') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Save record' }).click();
  const created = await (await createResponse).json() as { id: string };
  await expect(page.getByText(visibleText, { exact: true }).first()).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'View' }).first().click();
  await expect(page.getByText('RECORD DETAIL', { exact: true })).toBeVisible();
  await page.locator('button.icon-button').click();
  return created.id;
}

test.describe('tenant module navigation, forms, CRUD entry and filters', () => {
  test.describe.configure({ timeout: 120000 });

  test.beforeEach(async ({ page }) => login(page));

  test('sidebar groups the livelihood journey and highlights the active route', async ({ page }) => {
    const navigation = page.getByRole('navigation', { name: 'Main navigation' });
    for (const label of ['Workspace', 'Candidate journey', 'Training delivery', 'Employment outcomes', 'Local work & safety', 'Governance']) {
      await expect(navigation.getByText(label, { exact: true })).toBeVisible();
    }
    await page.goto('/candidates');
    await expect(navigation.locator('a[href="/candidates"]')).toHaveClass(/active/);
    await page.goto('/reports');
    await expect(navigation.locator('a[href="/reports"]')).toHaveClass(/active/);
  });

  test('course catalog locks YouTube lesson until subscription', async ({ page }) => {
    const tradeId = await firstId(page, '/workflow/trades');
    const stamp = Date.now().toString();
    await page.goto('/courses');
    await page.getByRole('button', { name: 'Add Course' }).click();
    await page.getByLabel('Trade ID', { exact: true }).fill(tradeId);
    await page.getByLabel('Course code', { exact: true }).fill(`PW-${stamp}`);
    await page.getByLabel('Course title', { exact: true }).fill(`Playwright Learning Course ${stamp}`);
    await page.getByLabel('YouTube lesson URL', { exact: false }).fill('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
    await page.getByRole('button', { name: 'Save course' }).click();
    await expect(page.getByText(`Playwright Learning Course ${stamp}`, { exact: true })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'View course' }).first().click();
    await expect(page.getByText('Subscribe to start learning', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Subscribe to course' }).click();
    await expect(page.locator('iframe[title*="Playwright Learning Course"]')).toBeVisible({ timeout: 10000 });
  });

  test('user adds supplied YouTube lesson metadata and plays the seeded course after subscribing', async ({ page }) => {
    const courseId = await firstId(page, '/workflow/courses?search=ACR-101');
    const updateResult = await page.evaluate(async ({ id }) => {
      const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '';
      const response = await fetch(`${'http://localhost:7006/api'}/workflow/courses/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
        body: JSON.stringify({ data: { youtubeUrl: 'https://www.youtube.com/watch?v=l7LLRP9ROBQ' } }),
      });
      return { status: response.status };
    }, { id: courseId });
    expect(updateResult.status).toBe(200);

    await page.goto('/courses');
    await page.getByPlaceholder('Search this workspace').fill('ACR-101');
    await page.getByPlaceholder('Search this workspace').press('Enter');
    await expect(page.getByText(/ACR-101/).first()).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'View course' }).first().click();
    await expect(page.getByText(/By wood work Telugu/)).toBeVisible({ timeout: 10000 });
    const subscribeButton = page.getByRole('button', { name: 'Subscribe to course' });
    if (await subscribeButton.count()) await subscribeButton.click();
    await expect(page.locator('iframe[src*="l7LLRP9ROBQ"]')).toBeVisible({ timeout: 10000 });
  });

  test('every navigation workspace renders list, search and status filter controls', async ({ page }) => {
    const modules = [
      '/counselling', '/recommendations', '/trades-and-skills', '/courses', '/partners', '/centres', '/trainers',
      '/batches', '/attendance', '/assignments', '/assessments', '/certificates', '/employers', '/vacancies',
      '/applications', '/interviews', '/offers', '/apprenticeships', '/placements', '/retention', '/earnings',
      '/service-areas', '/service-opportunities', '/service-bookings', '/complaints', '/payments', '/payouts',
      '/audit', '/documents',
    ];

    for (const modulePath of modules) {
      await test.step(modulePath, async () => {
        await page.goto(modulePath);
        await expect(page.locator('main h1')).toBeVisible();
        await expect(page.getByPlaceholder('Search this workspace')).toBeVisible();
        await expect(page.getByLabel('Filter by status')).toBeVisible();
        await expect(page.getByRole('button', { name: /^Add / })).toBeVisible();
        await page.getByRole('button', { name: /^Add / }).click();
        await expect(page.getByRole('button', { name: 'Close form' })).toBeVisible();
        await page.getByRole('button', { name: 'Close form' }).click();
        await page.getByLabel('Filter by status').selectOption('OPEN');
        await expect(page.getByLabel('Filter by status')).toHaveValue('OPEN');
        await page.getByLabel('Filter by status').selectOption('');
      });
    }
  });

  test('candidate form and configured workflow forms create records and search/filter them', async ({ page }) => {
    const stamp = Date.now().toString();
    const counsellorId = await login(page);
    const candidateId = await firstId(page, '/candidates?pageSize=1');
    const tradeId = await firstId(page, '/workflow/trades');
    const courseId = await firstId(page, '/workflow/courses');
    const curriculumId = await firstId(page, '/workflow/curricula');
    const centreId = await firstId(page, '/workflow/centres');
    const batchId = await firstId(page, '/workflow/batches');
    const enrollmentId = await firstId(page, '/workflow/enrollments');

    await test.step('candidate registration', async () => {
      await page.goto('/candidates/new');
      await page.getByLabel('Full name').fill(`Playwright Candidate ${stamp}`);
      await page.getByLabel('Date of birth').fill('1998-05-15');
      await page.getByLabel('Mobile').fill(`911${stamp.slice(-7)}`);
      await page.getByLabel('Trade interest').fill('AC and refrigeration');
      await page.getByLabel('Preferred language').selectOption('en');
      await page.getByRole('button', { name: 'Save registration' }).click();
      await expect(page).toHaveURL(/\/candidates$/);
      await expect(page.getByText(`Playwright Candidate ${stamp}`, { exact: true })).toBeVisible();
    });

    await createRecord(page, '/counselling', /Add Counselling/, { 'Candidate ID': candidateId, 'Counsellor ID': counsellorId, 'Session date': '2026-08-20', Interests: `Playwright interests ${stamp}` }, candidateId);
    await createRecord(page, '/partners', /Add Training partner/, { 'Partner name': `Playwright Partner ${stamp}`, 'Registration number': `REG-${stamp}`, Status: 'APPROVED' }, `Playwright Partner ${stamp}`);
    await createRecord(page, '/trainers', /Add Trainer/, { 'Trainer name': `Playwright Trainer ${stamp}`, Phone: '9000012345', 'Specialisations (comma separated)': 'AC, Safety' }, `Playwright Trainer ${stamp}`);
    await createRecord(page, '/centres', /Add Training centre/, { 'Centre name': `Playwright Centre ${stamp}`, District: 'Rangareddy', Capacity: '25', Status: 'APPROVED' }, `Playwright Centre ${stamp}`);
    await createRecord(page, '/batches', /Add Batch/, { 'Batch name': `Playwright Batch ${stamp}`, 'Course ID': courseId, 'Curriculum version ID': curriculumId, 'Centre ID': centreId, 'Start date': '2026-08-20', 'End date': '2026-11-20', Capacity: '20' }, `Playwright Batch ${stamp}`);
    await createRecord(page, '/attendance', /Add Attendance/, { 'Candidate ID': candidateId, 'Batch ID': batchId, 'Enrollment ID': enrollmentId, Date: '2026-08-20', 'Session type': `THEORY-${stamp}`, 'Present / absent': 'PRESENT' }, `THEORY-${stamp}`);
    await createRecord(page, '/assignments', /Add Practical assignment/, { 'Candidate ID': candidateId, 'Batch ID': batchId, 'Enrollment ID': enrollmentId, 'Assignment title': `Playwright Assignment ${stamp}`, Instructions: 'Complete the safe installation checklist.', 'Due date': '2026-09-20' }, `Playwright Assignment ${stamp}`);
    await createRecord(page, '/assessments', /Add Assessment/, { 'Batch ID': batchId, 'Course ID': courseId, 'Assessment name': `Playwright Assessment ${stamp}`, 'Theory / practical': 'THEORY', 'Scheduled at': '2026-09-25T10:00' }, `Playwright Assessment ${stamp}`);
    await createRecord(page, '/apprenticeships', /Add Apprenticeship/, { 'Candidate ID': candidateId, 'Trade ID': tradeId, 'Provider name': `Playwright Provider ${stamp}`, 'Start date': '2026-09-01', 'Monthly stipend': '8000' }, `Playwright Provider ${stamp}`);
    await createRecord(page, '/employers', /Add Employer/, { 'Employer name': `Playwright Employer ${stamp}`, District: 'Rangareddy', Phone: '9000099999', Email: `employer-${stamp}@example.local` }, `Playwright Employer ${stamp}`);
    const employerId = await firstId(page, `/workflow/employers?search=Playwright%20Employer%20${stamp}`);
    await createRecord(page, '/vacancies', /Add Vacancy/, { 'Employer ID': employerId, 'Trade ID': tradeId, 'Role title': `Playwright Vacancy ${stamp}`, Openings: '2', 'Minimum salary': '15000', 'Maximum salary': '22000', Location: 'Hyderabad', 'Risks and controls': 'PPE and electrical safety induction' }, `Playwright Vacancy ${stamp}`);
    await createRecord(page, '/service-areas', /Add Service area/, { 'Area name': `Playwright Area ${stamp}`, District: 'Rangareddy', 'Postal codes (comma separated)': '500001,500002' }, `Playwright Area ${stamp}`);
    const areaId = await firstId(page, `/workflow/serviceAreas?search=Playwright%20Area%20${stamp}`);
    await createRecord(page, '/service-opportunities', /Add Service opportunity/, { 'Service area ID': areaId, 'Trade ID': tradeId, 'Opportunity title': `Playwright Opportunity ${stamp}`, Description: 'Safe AC service visit.', Price: '750' }, `Playwright Opportunity ${stamp}`);
    const opportunityId = await firstId(page, `/workflow/serviceOpportunities?search=Playwright%20Opportunity%20${stamp}`);
    await createRecord(page, '/service-bookings', /Add Service booking/, { 'Opportunity ID': opportunityId, 'Technician candidate ID': candidateId, 'Customer name': `Playwright Customer ${stamp}`, 'Customer mobile': '9000088888', 'Service address': 'Rangareddy', 'Agreed amount': '750' }, `Playwright Customer ${stamp}`);
    const complaintId = await createRecord(page, '/complaints', /Add Safety and complaint/, { Category: `PLAYWRIGHT-${stamp}`, Description: 'Created by the module acceptance suite.', Severity: 'LOW' }, `PLAYWRIGHT-${stamp}`);
    await createRecord(page, '/payments', /Add Payment/, { Amount: '750', Provider: 'LOCAL', 'Provider reference': `PAY-${stamp}` }, '750');
    await createRecord(page, '/payouts', /Add Payout/, { Amount: '650', 'Idempotency key': `PAYOUT-${stamp}` }, '650');
    await createRecord(page, '/earnings', /Add Earning/, { 'Candidate ID': candidateId, Month: '2050-01-01', 'Gross income': '22000', 'Net income': '18000', Source: `PLAYWRIGHT-${stamp}` }, `PLAYWRIGHT-${stamp}`);

    const updateResult = await page.evaluate(async ({ id, category }) => {
      const csrf = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)?.[1] || '';
      const response = await fetch(`${'http://localhost:7006/api'}/workflow/complaints/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': decodeURIComponent(csrf) },
        body: JSON.stringify({ data: { category } }),
      });
      return { status: response.status };
    }, { id: complaintId, category: `UPDATED-${stamp}` });
    expect(updateResult.status).toBe(200);

    await page.goto('/complaints');
    await page.getByPlaceholder('Search this workspace').fill(`UPDATED-${stamp}`);
    await page.getByPlaceholder('Search this workspace').press('Enter');
    await expect(page.getByText(`UPDATED-${stamp}`, { exact: true })).toBeVisible();
    await page.getByLabel('Filter by status').selectOption('OPEN');
    await expect(page.getByLabel('Filter by status')).toHaveValue('OPEN');
  });
});
