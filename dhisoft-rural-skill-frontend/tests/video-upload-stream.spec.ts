import { expect, test } from '@playwright/test';

const password = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!password) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before testing video streaming.');

async function login(page: import('@playwright/test').Page, tenant: string, email: string) {
  await page.goto('/login');
  await page.getByLabel('Tenant slug').fill(tenant);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);
}

test('uploaded course video streams to subscribed student', async ({ page }) => {
  test.setTimeout(120000);
  const title = 'Community Cooling Safety Lesson';
  await login(page, 'rural-pilot', 'owner@rural-pilot.local');
  const tradeId = await page.evaluate(async () => (await (await fetch('http://localhost:7006/api/workflow/trades', { credentials: 'include' })).json() as { data: Array<{ id: string }> }).data[0].id);
  await page.goto('/courses');
  await page.getByRole('button', { name: 'Add Course' }).click();
  await page.getByLabel('Trade ID').fill(tradeId);
  await page.getByLabel('Course code').fill(`VSC-${Date.now()}`);
  await page.getByLabel('Course title').fill(title);
  await page.getByLabel('Upload lesson video').setInputFiles('test-assets/acceptance-lesson.mp4');
  await page.getByRole('button', { name: 'Save course' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Log out' }).click();
  await login(page, 'rural-pilot', 'student@rural-pilot.local');
  await page.goto('/courses');
  await page.getByPlaceholder('Search this workspace').fill(title);
  await page.getByPlaceholder('Search this workspace').press('Enter');
  await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'View course' }).click();
  const streamResponse = page.waitForResponse((response) => response.url().includes('/api/documents/course-video/') && response.status() >= 200 && response.status() < 300);
  await page.getByRole('button', { name: 'Subscribe to course' }).click();
  const video = page.locator('video');
  await expect(video).toBeVisible();
  const streamed = await streamResponse;
  expect(streamed.headers()['content-type']).toContain('video/mp4');
  await video.evaluate((element) => new Promise<void>((resolve) => { const player = element as HTMLVideoElement; if (player.readyState >= 1) resolve(); else player.addEventListener('loadedmetadata', () => resolve(), { once: true }); }));
  expect(await video.evaluate((element) => (element as HTMLVideoElement).duration)).toBeGreaterThan(0);
});
