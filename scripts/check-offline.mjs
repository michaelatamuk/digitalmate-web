// Verifies that the production build reopens offline after the service worker installs.
// Usage: npm run build && npm run preview -- --port 4173, then npm run check:offline

import { chromium } from '@playwright/test';

const url = process.env.OFFLINE_URL ?? 'http://127.0.0.1:4173';

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: 'networkidle' });
  await Promise.race([
    page.evaluate(() => navigator.serviceWorker.ready),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('service worker did not become ready')), 20_000)
    )
  ]);
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, {
    timeout: 15_000
  });
  // Give the page a moment to prime the hashed JS/CSS assets into the cache.
  await page.waitForTimeout(1_000);

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });

  const composer = page.locator('.composer textarea');
  await composer.waitFor({ state: 'visible', timeout: 10_000 });
  const title = await page.title();
  console.log(`offline reload OK · title=${title}`);
  process.exitCode = 0;
} catch (error) {
  console.error(`offline check failed: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
