import { expect, test } from '@playwright/test';

const password = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!password) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before recording.');

test('recorded Chrome acceptance journey', async ({ page }) => {
  const category = `Household electrical safety follow-up ${Date.now()}`;

  await page.goto('/login');
  await expect(page.getByText('Tenant login')).toBeVisible();
  await page.getByLabel('Tenant slug').fill('rural-pilot');
  await page.getByLabel('Email').fill('owner@rural-pilot.local');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/candidates');
  await expect(page.locator('main h1')).toBeVisible();

  await page.goto('/complaints');
  await expect(page.getByRole('heading', { name: 'Safety and complaints' })).toBeVisible();
  await page.getByRole('button', { name: /Add Safety and complaint/ }).click();
  await page.getByLabel('Category').fill(category);
  await page.getByLabel('Description').fill('Recorded Chrome acceptance journey.');
  await page.getByLabel('Severity').fill('LOW');
  await page.getByRole('button', { name: 'Save record' }).click();

  await expect(page.getByText(category, { exact: true })).toBeVisible({ timeout: 10000 });
});
