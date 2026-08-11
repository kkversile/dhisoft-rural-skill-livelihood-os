import { expect, test } from '@playwright/test';

const loginPassword = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD || process.env.PLAYWRIGHT_LOGIN_PASSWORD;
if (!loginPassword) throw new Error('Set NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD or PLAYWRIGHT_LOGIN_PASSWORD before running Playwright.');

test('tenant user can log in and create a complaint', async ({ page }) => {
  const category = `PLAYWRIGHT-${Date.now()}`;

  await page.goto('/login');
  await expect(page.getByLabel('Tenant slug')).toHaveValue('rural-pilot');
  await expect(page.getByLabel('Email')).toHaveValue('owner@rural-pilot.local');
  await expect(page.getByLabel('Password')).toHaveValue(loginPassword);
  await page.getByLabel('Tenant slug').fill('rural-pilot');
  await page.getByLabel('Email').fill('owner@rural-pilot.local');
  await page.getByLabel('Password').fill(loginPassword);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/complaints');
  await expect(page.getByRole('heading', { name: 'Safety and complaints' })).toBeVisible();
  await page.getByRole('button', { name: /Add Safety and complaint/ }).click();
  await page.getByLabel('Category').fill(category);
  await page.getByLabel('Description').fill('Created through the Playwright acceptance flow.');
  await page.getByLabel('Severity').fill('LOW');
  await page.getByRole('button', { name: 'Save record' }).click();

  await expect(page.getByText(category)).toBeVisible({ timeout: 10000 });
});
