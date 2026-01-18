import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 300000,
  retries: process.env.CI ? 1 : 0,
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    animations: 'disabled',
    screenshot: 'on',
    trace: 'on',
    video: 'on',
  },
  projects: [
    {
      name: 'default',
      testIgnore: 'showcase.spec.ts',
    },
    {
      name: 'showcase',
      testMatch: 'showcase.spec.ts',
      use: {
        animations: 'allow',
        video: {
          mode: 'on',
          size: { width: 1920, height: 1080 },
        },
        viewport: { width: 1920, height: 1080 },
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
