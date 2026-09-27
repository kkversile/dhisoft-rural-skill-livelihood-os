import { loadEnvConfig } from '@next/env';
import { defineConfig } from '@playwright/test';

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/recorded-e2e',
  reporter: [['line'], ['json', { outputFile: './artifacts/recorded-e2e/results.json' }]],
  use: {
    baseURL: 'http://localhost:7000',
    channel: 'chrome',
    headless: false,
    video: 'on',
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 7000,
    reuseExistingServer: true,
  },
});
