import { defineConfig } from '@playwright/test';

// Requires the private, isolated D5 synthetic account/database environment.
export default defineConfig({
  testDir: './tests/browser', testMatch: 'd6.pw.ts', workers: 1, retries: 0,
  timeout: 90_000, expect: {timeout: 10_000},
  outputDir: '.local-dev/d6-browser/results', reporter: 'list',
  use: {baseURL: 'http://127.0.0.1:3007', channel: 'msedge', headless: true,
    actionTimeout: 10_000, navigationTimeout: 10_000,
    launchOptions: {ignoreDefaultArgs: ['--no-sandbox']}},
  webServer: {command: 'node dist/server.cjs', url: 'http://127.0.0.1:3007/health',
    timeout: 30_000, reuseExistingServer: false,
    env: {NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '3007'}},
});
