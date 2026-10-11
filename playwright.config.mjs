import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 60000,
  expect: { timeout: 10000 },
  workers: 1,
  use: { browserName:'chromium',channel:'msedge',baseURL:'http://localhost:5173',viewport:{width:1440,height:900},launchOptions:{args:['--enable-webgl','--ignore-gpu-blocklist']} },
  reporter: 'list',
});
