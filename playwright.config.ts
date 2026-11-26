import { defineConfig, devices } from '@playwright/test';

const port = 5175;
const baseURL = `http://127.0.0.1:${port}`;
// A second dev server is pointed at the reference Hive bridge, so the clientâ†”server path is covered
// in CI instead of only by hand. `--mode bridge` loads `.env.bridge`.
const bridgePort = 8788;
const bridgedPort = 5176;
const bridgeBase = `http://127.0.0.1:${bridgePort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: [
    {
      command: `npm run dev -- --port ${port}`,
      url: baseURL,
      reuseExistingServer: false,
      env: { VITE_AUTO_BACKEND: 'off' },
      timeout: 120_000
    },
    {
      command: 'node services/hive-bridge/server.mjs',
      url: `${bridgeBase}/api/hive/health`,
      env: { HIVE_BRIDGE_PORT: String(bridgePort) },
      reuseExistingServer: false,
      timeout: 60_000
    },
    {
      command: `npm run dev -- --port ${bridgedPort} --mode bridge`,
      url: `http://127.0.0.1:${bridgedPort}`,
      reuseExistingServer: false,
      env: { VITE_AUTO_BACKEND: 'off' },
      timeout: 120_000
    }
  ]
});
