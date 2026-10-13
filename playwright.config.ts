import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://www.rbauction.com',
    channel: 'chrome',
    trace: 'retain-on-failure',
  },
});
