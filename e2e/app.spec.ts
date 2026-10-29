import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const composer = (page: Page) => page.locator('.composer textarea');

async function sendMessage(page: Page, text: string) {
  await composer(page).fill(text);
  await expect(page.locator('.composer-send')).toBeEnabled();
  await page.locator('.composer-send').click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => window.localStorage.clear());
  await page.goto('/');
});

test('home renders the shell and composer', async ({ page }) => {
  await expect(page).toHaveTitle(/DigitalMate/);
  await expect(
    page.getByText(/Good (morning|afternoon|evening)|早上好|下午好|晚上好/).first()
  ).toBeVisible();
  await expect(composer(page)).toBeVisible();
  await expect(page.locator('.composer-send')).toBeDisabled();
  await composer(page).fill('Hello');
  await expect(page.locator('.composer-send')).toBeEnabled();
});

test('travel query renders A2UI cards and opens a detail sheet', async ({ page }) => {
  await sendMessage(page, 'Find trains from Beijing to Shanghai tomorrow evening');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Beijing → Shanghai' })).toBeVisible();
  await expect(page.locator('.travel-card')).toHaveCount(4);
  await page.locator('.travel-card').first().click();
  await expect(page.getByRole('heading', { name: 'G21' })).toBeVisible();
  await expect(page.getByText('12306').first()).toBeVisible();
  await page.locator('.sheet-head .icon-button').click();
  await expect(page.locator('.sheet-layer')).toHaveCount(0);
});

test('language switch resets to Simplified Chinese', async ({ page }) => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Settings|设置/ }).click();
  await page.getByRole('button', { name: '中文' }).click();
  await expect(page.getByText(/今天想聊点什么|早上好|下午好|晚上好/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '更多' })).toBeVisible();
});

test('protocol demo renders JSONL-driven components', async ({ page }) => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /A2UI protocol demo/ }).click();
  await expect(page.locator('.hero-banner')).toBeVisible();
  await expect(page.locator('.flight-board')).toBeVisible();
  await expect(page.locator('.flight-row')).toHaveCount(2);
  await expect(page.locator('.tool-connect-card')).toBeVisible();
  await expect(page.locator('.skeleton-card')).toBeVisible();
});

test('is installable and advertises account-free offline access', async ({ page }) => {
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Account-free access')).toBeVisible();
  await expect(page.getByText(/No account is required/)).toBeVisible();
  await expect(page.getByText(/Offline ·|Online ·/)).toBeVisible();
});

test('previews and sends a local attachment without uploading', async ({ page }) => {
  await page.locator('.composer-wrap input[type="file"]').setInputFiles({
    name: 'notes.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('Local attachment preview works.')
  });
  await expect(page.getByRole('button', { name: 'Preview notes.txt' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview notes.txt' }).click();
  await expect(page.locator('.attachment-preview-text')).toContainText('Local attachment preview works.');
  await expect(page.getByText(/Previewed locally/)).toBeVisible();
  await page.locator('.sheet-head .icon-button').click();

  await page.locator('.composer-send').click();
  await expect(page.locator('.user-bubble')).toHaveText('Summarize the attachment');
  await expect(page.locator('.message-attachment')).toContainText('notes.txt');
  await expect(page.locator('.message-assistant')).toBeVisible();
});

test('retries and clears a local message exchange', async ({ page }) => {
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await expect(page.locator('.message-actions').last()).toBeVisible();
  const userCount = await page.locator('.message-user').count();

  await page.locator('.message-actions').last().getByRole('button', { name: 'Retry' }).click();
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await expect(page.locator('.message-user')).toHaveCount(userCount);

  await page.locator('.message-actions').last().getByRole('button', { name: 'Clear' }).click();
  await expect(page.locator('.message-assistant')).toHaveCount(0);
  await expect(page.locator('.message-user')).toHaveCount(0);
});

test('edits and forgets local memory without an account', async ({ page }) => {
  await page.getByRole('button', { name: 'About you' }).click();
  await page.getByRole('button', { name: 'Edit memory' }).click();
  await page.getByLabel('Name', { exact: true }).fill('Test User');
  await page.getByLabel('Summary').fill('Prefers local-first tools and short replies.');
  await page.getByRole('button', { name: 'Save memory' }).click();
  await expect(page.locator('.memory-head h3')).toHaveText('Test User');

  await page.locator('.sheet-head .icon-button').click();
  await page.getByRole('button', { name: 'About you' }).click();
  await expect(page.locator('.memory-head h3')).toHaveText('Test User');

  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Forget everything' }).click();
  await expect(page.locator('.memory-head h3')).toHaveText('You');
});

test('exports and restores a local backup without an account', async ({ page }) => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Settings/ }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^digitalmate-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const backup = {
    app: 'digitalmate-web',
    version: 1,
    exportedAt: '2026-10-29T10:00:00.000Z',
    data: {
      'digitalmate.web.v2.messages.v1': '[{"id":"restored"}]'
    }
  };
  await page.locator('.sheet-layer .hidden-file-input').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });

  await page.waitForFunction(
    () => window.localStorage.getItem('digitalmate.web.v2.messages.v1') === '[{"id":"restored"}]',
    null,
    { timeout: 10_000 }
  );
});

test('Orbit mode falls back to the mock when the bridge is not configured', async ({ page }) => {
  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await page.getByRole('button', { name: 'Orbit cloud' }).click();
  await expect(page.locator('.orbit-status.is-off')).toContainText(/not configured|未配置/);
  await page.locator('.sheet-head .icon-button').click();
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await expect(page.locator('.food-card').first()).toBeVisible();
});

test('RSS form validates URLs before calling the proxy', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('button', { name: 'RSS', exact: true }).first().click();
  await page.getByRole('textbox', { name: 'RSS URL' }).fill('not-a-url');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(/Enter a valid RSS \/ Atom URL/)).toBeVisible();
});

test('mobile layout does not overflow horizontally', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator('.composer')).toBeVisible();
});

test('home and settings have no critical accessibility violations', async ({ page }) => {
  test.setTimeout(90_000);
  const home = await new AxeBuilder({ page }).include('main').analyze();
  expect(home.violations.filter(violation => violation.impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: 'More' }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.locator('.sheet-layer')).toBeVisible();
  const settings = await new AxeBuilder({ page }).include('.sheet-layer').analyze();
  expect(settings.violations.filter(violation => violation.impact === 'critical')).toEqual([]);
});
