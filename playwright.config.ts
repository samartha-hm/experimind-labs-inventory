import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '*.pw.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: '.local-dev/browser-acceptance/results',
  reporter: [['list'], ['json', { outputFile: '.local-dev/browser-acceptance/results.json' }]],
  use: {
    actionTimeout: 15_000,
    baseURL: 'http://127.0.0.1:3100',
    channel: 'msedge',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    launchOptions: { ignoreDefaultArgs: ['--no-sandbox'] },
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
