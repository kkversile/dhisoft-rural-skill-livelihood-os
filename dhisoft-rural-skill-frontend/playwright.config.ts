import { loadEnvConfig } from '@next/env';
import { defineConfig } from '@playwright/test';

loadEnvConfig(process.cwd());

export default defineConfig({
  testDir: './tests',
  use: { baseURL: 'http://localhost:7000', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', port: 7000, reuseExistingServer: true },
});
