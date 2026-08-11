import { expect, test } from '@playwright/test';

const loginPassword = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!loginPassword) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before running Playwright.');

const users = [
  ['rural-pilot', 'owner@rural-pilot.local'],
  ['rural-pilot', 'programme@rural-pilot.local'],
  ['rural-pilot', 'coordinator@rural-pilot.local'],
  ['rural-pilot', 'trainer@rural-pilot.local'],
  ['rural-pilot', 'assessor@rural-pilot.local'],
  ['rural-pilot', 'employer@rural-pilot.local'],
  ['rural-pilot', 'finance@rural-pilot.local'],
  ['second-tenant', 'owner@second.local'],
] as const;

test.describe('Chrome authentication coverage for every seeded user', () => {
  test.describe.configure({ timeout: 120000 });

  test('each seeded user can log in and use the real logout action', async ({ page }) => {
    for (const [tenantSlug, email] of users) {
      await test.step(`${tenantSlug} / ${email}`, async () => {
        await page.goto('/login');
        await page.getByLabel('Tenant slug').fill(tenantSlug);
        await page.getByLabel('Email').fill(email);
        await page.getByLabel('Password').fill(loginPassword);
        await page.getByRole('button', { name: 'Sign in' }).click();
        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();

        await page.getByRole('button', { name: 'Log out' }).click();
        await expect(page).toHaveURL(/\/login$/);
        await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();

        await page.goto('/');
        await expect(page.getByText('Sign in to see your tenant outcome dashboard.')).toBeVisible();
      });
    }
  });
});
