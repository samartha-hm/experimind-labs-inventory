import { defineConfig } from '@playwright/test';

// Supply the private synthetic database/role environment to the test process.
// Build first with the explicitly authorized trusted UI flags enabled.
export default defineConfig({
  testDir: './tests/browser',
  testMatch: 'd5.pw.ts',
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  outputDir: '.local-dev/d5-browser/results',
  reporter: [['list'], ['json', { outputFile: '.local-dev/d5-browser/results.json' }]],
  use: {
    baseURL: 'http://127.0.0.1:3006', channel: 'msedge', headless: true,
    viewport: { width: 1440, height: 1000 }, timezoneId: 'UTC', actionTimeout: 10_000,
    navigationTimeout: 10_000, trace: 'off', screenshot: 'only-on-failure',
    launchOptions: { ignoreDefaultArgs: ['--no-sandbox'] },
  },
  webServer: {
    command: 'node dist/server.cjs', url: 'http://127.0.0.1:3006/health',
    timeout: 30_000, reuseExistingServer: false,
    env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '3006' },
  },
});
