import { loadEnvConfig } from '@next/env';
import { defineConfig } from '@playwright/test';

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests',
  outputDir: './artifacts/full-recording',
  reporter: [['line'], ['json', { outputFile: './artifacts/full-recording/results.json' }]],
  use: {
    baseURL: 'http://localhost:7000',
    channel: 'chrome',
    headless: false,
    viewport: { width: 1280, height: 720 },
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 7000,
    reuseExistingServer: true,
  },
});
