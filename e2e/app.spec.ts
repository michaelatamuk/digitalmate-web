import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const composer = (page: Page) => page.locator('.composer textarea');

async function sendMessage(page: Page, text: string) {
  await composer(page).fill(text);
  await expect(page.locator('.composer-send')).toBeEnabled();
  await page.locator('.composer-send').click();
}

function makePdf(text: string): Buffer {
  const stream = `BT /F1 18 Tf 72 720 Td (${text}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.sessionStorage.getItem('dm-e2e-initialized')) {
      window.localStorage.clear();
      window.localStorage.setItem('digitalmate.web.v2.welcomeSeen.v1', 'true');
      window.sessionStorage.setItem('dm-e2e-initialized', '1');
    }
  });
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
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings|设置/ }).click();
  await page.getByRole('button', { name: '中文' }).click();
  await expect(page.getByText(/今天想聊点什么|早上好|下午好|晚上好/).first()).toBeVisible();
  await expect(page.getByRole('button', { name: '更多' })).toBeVisible();
});

test('protocol demo renders JSONL-driven components', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /A2UI protocol demo/ }).click();
  await expect(page.locator('.hero-banner')).toBeVisible();
  await expect(page.locator('.flight-board')).toBeVisible();
  await expect(page.locator('.flight-row')).toHaveCount(2);
  await expect(page.locator('.tool-connect-card')).toBeVisible();
  await expect(page.locator('.a2ui-thinking-card')).toBeVisible();
  await expect(page.locator('.receiving-card')).toBeVisible();
  await expect(page.locator('.skeleton-card')).toBeVisible();
});

test('inspects, exports and imports local skills', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Skill center/ }).click();
  await page.locator('.skill-detail-link').first().click();
  await expect(page.locator('.skill-detail')).toBeVisible();
  await expect(page.locator('.skill-detail')).toContainText('Version');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export / publish bundle' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^digitalmate-skills-\d{4}-\d{2}-\d{2}\.json$/);

  await page.locator('.skill-import-input').setInputFiles({
    name: 'skills.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        app: 'digitalmate-web',
        kind: 'skills',
        version: 1,
        exportedAt: '2026-10-29T10:00:00.000Z',
        skills: [
          {
            id: 'local-test',
            name: 'Local test skill',
            icon: 'T',
            category: 'Local',
            description: 'A skill imported from a local file.',
            author: 'Tester',
            version: '1.0.0',
            capabilities: ['Read a file', 'Summarize locally']
          }
        ]
      })
    )
  });

  await expect(page.getByText('Local test skill')).toBeVisible();
  await page.locator('.sheet-head .icon-button').click();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Skill center/ }).click();
  await expect(page.getByText('Local test skill')).toBeVisible();
});

test('renders an interactive local shopping checklist', async ({ page }) => {
  await sendMessage(page, 'Make a grocery shopping list');
  await expect(page.locator('.a2ui-checklist')).toBeVisible();
  const first = page.locator('.checklist-row input').first();
  await expect(first).not.toBeChecked();
  await page.locator('.checklist-row').first().click();
  await expect(first).toBeChecked();
});

test('shows local task rows with detail and retry', async ({ page }) => {
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Sessions & tasks/ }).click();
  await expect(page.locator('.task-row')).toHaveCount(1);
  await page.locator('.task-row').first().click();
  await expect(page.locator('.task-prompt')).toContainText('Find coffee nearby');
  await expect(page.getByText('local', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry task' })).toBeVisible();
});

test('renders approval and connection quota cards', async ({ page }) => {
  await sendMessage(page, 'Show the approval and connection quota');
  await expect(page.locator('.approval-card')).toBeVisible();
  await expect(page.locator('.quota-card')).toBeVisible();
  await expect(page.getByText(/No account, OAuth scope or live tool/)).toBeVisible();
});

test('saves a reply as a local artifact and previews it', async ({ page }) => {
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await page.locator('.message-actions').last().getByRole('button', { name: 'Artifact' }).click();
  await expect(page.locator('.artifact-row')).toHaveCount(0);

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Artifacts/ }).click();
  await expect(page.locator('.artifact-row')).toHaveCount(1);
  await page.locator('.artifact-row').first().click();
  await expect(page.locator('.artifact-preview')).toContainText('coffee');
  await expect(page.locator('.artifact-preview')).toContainText('sources');
  await expect(page.locator('.artifact-surface .a2ui-surface')).toBeVisible();
});

test('shows the welcome deck on a first visit', async ({ page }) => {
  await page.evaluate(() => window.localStorage.removeItem('digitalmate.web.v2.welcomeSeen.v1'));
  await page.reload();
  await expect(page.getByText('Start with a real task')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Tune your discovery feed')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText('Account-free by design')).toBeVisible();
  await page.getByRole('button', { name: 'Start using DigitalMate' }).click();
  await expect(page.locator('.welcome-layer')).toHaveCount(0);
});

test('opens local lab demos without side effects', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Labs/ }).click();
  await expect(page.getByText('BIM dashboard')).toBeVisible();
  await page.getByRole('button', { name: /BIM dashboard/ }).click();
  await expect(page.getByText('82 kWh')).toBeVisible();
  const scan = await new AxeBuilder({ page }).include('.sheet-layer').analyze();
  expect(
    scan.violations
      .filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
      .map(violation => violation.id)
  ).toEqual([]);
  await page.getByRole('button', { name: /All labs/ }).click();
  await page.getByRole('button', { name: /Checkout review/ }).click();
  await page.getByRole('button', { name: 'Review payment (demo)' }).click();
  await expect(page.getByText(/payment is not available|不提供支付/)).toBeVisible();
});

test('switches companion, model, project and tools locally', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Companion: Default companion/ })).toBeVisible();
  await page.getByRole('button', { name: /Companion: Default companion/ }).click();
  await expect(page.getByText('Choose a companion')).toBeVisible();
  await page.getByRole('button', { name: /Food companion/ }).click();
  await expect(page.locator('.persona-row.is-active')).toContainText('Food companion');
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet-layer')).toHaveCount(0);
  await expect(page.locator('.context-chip.is-persona')).toContainText('Food companion');

  await page.locator('.context-chip').nth(1).click();
  await page.getByRole('button', { name: /Local · Fast/ }).click();
  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet-layer')).toHaveCount(0);
  await expect(page.locator('.context-chip').nth(1)).toContainText('Local · Fast');

  await page.locator('.context-toggle').click();
  await expect(page.locator('.context-toggle')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('.context-chip').nth(3).click();
  await expect(page.getByText('Capabilities and tools')).toBeVisible();
  await page.getByRole('button', { name: /Weather MCP/ }).click();
  await page.locator('.sheet-head .icon-button').click();
  await expect(page.locator('.context-chip').nth(3)).toContainText('4 tools');
});

test('edits discovery topics in natural language and remembers read state', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  await expect(page.locator('.feed-kind-badge').first()).toBeVisible();
  await page.locator('.search-field input').fill('show me more robotics and open source');
  await page.locator('.search-field input').press('Enter');
  await expect(page.locator('.topic-chip.is-active')).toHaveText(['Robotics', 'Open Source']);
  await expect(page.locator('.feed-card')).toHaveCount(3);

  await page.getByRole('button', { name: 'All', exact: true }).click();
  const firstTitle = await page.locator('.feed-card h2').first().innerText();
  await page.locator('.feed-cover-button').first().click();
  await expect(page.locator('.detail-layer')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  const readCard = page.locator('.feed-card', { hasText: firstTitle }).first();
  await expect(readCard.locator('.feed-read-badge')).toBeVisible();
});

test('toggles discovery sources locally', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('button', { name: 'Sources' }).click();
  await expect(page.locator('.source-toggle')).toHaveCount(11);
  const allCards = await page.locator('.feed-card').count();
  await page.locator('.source-toggle').first().click();
  await expect(page.locator('.source-pill.is-disabled')).toHaveCount(1);
  expect(await page.locator('.feed-card').count()).toBeLessThan(allCards);
});

test('reorders and hides discovery topics', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  const roboticsRow = page.locator('.topic-manage-row', { hasText: 'Robotics' });
  await roboticsRow.getByRole('button', { name: /Hide/ }).click();
  await expect(page.locator('.topic-chip', { hasText: 'Robotics' })).toHaveCount(0);
  await roboticsRow.getByRole('button', { name: /Show/ }).click();
  await expect(page.locator('.topic-chip', { hasText: 'Robotics' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset topic order' }).click();
});

test('starts with all discovery topics and no skill pre-selected', async ({ page }) => {
  await expect(page.locator('.skill-active')).toHaveText('Default companion');
  await expect(page.locator('.skill-pill.is-active')).toHaveCount(0);

  await page.getByRole('button', { name: 'Discover' }).click();
  await expect(page.locator('.topic-chip.is-active')).toHaveText('All');
  const allCount = await page.locator('.feed-card').count();
  expect(allCount).toBeGreaterThan(7);

  await page.locator('.topic-chip', { hasText: 'Robotics' }).click();
  await expect(page.locator('.topic-chip.is-active')).toHaveText('Robotics');
  const filteredCount = await page.locator('.feed-card').count();
  expect(filteredCount).toBeLessThan(allCount);
  expect(filteredCount).toBeGreaterThan(0);

  await page.locator('.topic-chip', { hasText: /^All$/ }).click();
  await expect(page.locator('.feed-card')).toHaveCount(allCount);
});

test('discover covers show images and open the story', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  const cover = page.locator('.feed-cover-image').first();
  await expect(cover).toBeVisible();
  await expect(cover).toHaveAttribute('src', /\/covers\/.+\.(svg|jpg)$/);
  await page.locator('.feed-cover-button').first().click();
  await expect(page.locator('.detail-layer')).toBeVisible();
  await expect(page.locator('.detail-cover-image')).toBeVisible();
});

test('searches the local discovery feed', async ({ page }) => {
  await page.getByRole('button', { name: 'Discover' }).click();
  const cards = page.locator('.feed-card');
  const initial = await cards.count();
  expect(initial).toBeGreaterThan(1);
  const firstTitle = await page.locator('.feed-card h2').first().innerText();

  await page.getByRole('textbox', { name: 'Search feed' }).fill(firstTitle);
  await expect(cards).toHaveCount(1);
  await expect(page.locator('.feed-card h2').first()).toHaveText(firstTitle);

  await page.getByRole('button', { name: 'Clear search' }).first().click();
  await expect(cards).toHaveCount(initial);
});

test('shares a saved article from the detail view', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: string | null }).__shared = null;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { text?: string }) => {
        (window as unknown as { __shared: string | null }).__shared = data.text ?? '';
      }
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Discover' }).click();
  const title = await page.locator('.feed-card h2').first().innerText();
  await page.locator('.feed-title-button').first().click();
  await page.locator('.detail-actions').getByRole('button', { name: 'Share' }).click();
  const shared = await page.evaluate(
    () => (window as unknown as { __shared: string | null }).__shared
  );
  expect(shared).toContain(title);
});

test('shows an offline banner while local mode stays usable', async ({ page }) => {
  await page.evaluate(() => window.dispatchEvent(new Event('offline')));
  await expect(page.locator('.offline-banner')).toContainText(/Offline/);
  await expect(composer(page)).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('.offline-banner')).toHaveCount(0);
});

test('is installable and advertises account-free offline access', async ({ page }) => {
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.webmanifest');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Account-free access')).toBeVisible();
  await expect(page.getByText(/No account is required/)).toBeVisible();
  await expect(page.getByText(/Offline ·|Online ·/)).toBeVisible();
  await expect(page.getByText(/^Version \d+\.\d+\.\d+$/)).toBeVisible();
  await page.getByRole('button', { name: 'Check for updates' }).click();
  await expect(page.getByText(/No offline cache is registered/)).toBeVisible();
});

test('previews and sends a local attachment without uploading', async ({ page }) => {
  await page.locator('.composer-wrap input[type="file"]:not([capture])').setInputFiles({
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

test('extracts searchable text from a local PDF', async ({ page }) => {
  await page.locator('.composer-wrap input[type="file"]:not([capture])').setInputFiles({
    name: 'report.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf('DigitalMate PDF test')
  });
  await expect(page.getByRole('button', { name: 'Preview report.pdf' })).toBeVisible({
    timeout: 15_000
  });
  await page.getByRole('button', { name: 'Preview report.pdf' }).click();
  await expect(page.locator('.attachment-preview-text')).toContainText('DigitalMate PDF test', {
    timeout: 15_000
  });
  await expect(page.getByText(/PDF text extracted locally/)).toBeVisible();
});

test('shares a reply through the Web Share API', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __shared: string | null }).__shared = null;
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (data: { text?: string }) => {
        (window as unknown as { __shared: string | null }).__shared = data.text ?? '';
      }
    });
  });
  await page.reload();
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await page.locator('.message-actions').last().getByRole('button', { name: 'Share' }).click();
  const shared = await page.evaluate(
    () => (window as unknown as { __shared: string | null }).__shared
  );
  expect(shared).toContain('coffee');
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
  await expect(page.getByText(/From the local demo profile/)).toBeVisible();
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
  await page.getByRole('button', { name: 'More', exact: true }).click();
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

test('keeps a local-only diagnostic log that can be exported and cleared', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('Diagnostics', { exact: true })).toBeVisible();
  await expect(page.getByText('No errors recorded.')).toBeVisible();

  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent('error', {
        message: 'E2E diagnostic failure',
        filename: 'https://example.com/private?token=secret'
      })
    );
  });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.getByText('1 local entry stored.')).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export log' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^digitalmate-diagnostics-\d{4}-\d{2}-\d{2}\.json$/);

  await page.getByRole('button', { name: 'Clear log' }).click();
  await expect(page.getByText('No errors recorded.')).toBeVisible();
});

test('Orbit mode falls back to the mock when the bridge is not configured', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
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

test('shows the Hive demo with Bees and a question flow', async ({ page }) => {
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await expect(page.getByRole('tab', { name: /Scout/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Forge/ })).toBeVisible();
  await expect(page.getByRole('tab', { name: /Ledger/ })).toBeVisible();
  const hiveScan = await new AxeBuilder({ page }).include('.sheet-layer').analyze();
  expect(
    hiveScan.violations
      .filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
      .map(violation => violation.id)
  ).toEqual([]);

  await page.getByRole('tab', { name: /Forge/ }).click();
  // Drafts belong to the lane: switching Bees must not discard unsent work.
  await page.locator('.hive-composer textarea').fill('forge draft in progress');
  await page.getByRole('tab', { name: /Ledger/ }).click();
  await expect(page.locator('.hive-composer textarea')).toHaveValue('');
  await page.getByRole('tab', { name: /Forge/ }).click();
  await expect(page.locator('.hive-composer textarea')).toHaveValue('forge draft in progress');

  await page.locator('.hive-composer textarea').fill('Draft an email to Alice about the launch');
  // Attachments are real files: capped at five, sized, and removable before sending.
  const attachments = Array.from({ length: 6 }, (_, index) => ({
    name: `f${index}.txt`,
    mimeType: 'text/plain',
    buffer: Buffer.from(`file ${index}`)
  }));
  await page.locator('.hive-composer input[type="file"]').setInputFiles(attachments);
  await expect(page.getByText('You can attach up to 5 files.')).toBeVisible();
  await expect(page.locator('.hive-attachment-name')).toHaveCount(5);
  await page.getByRole('button', { name: 'Remove f0.txt' }).click();
  await expect(page.locator('.hive-attachment-name')).toHaveCount(4);
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-detail .hive-attachments')).toContainText('f1.txt');
  await expect(page.locator('.hive-question')).toBeVisible({ timeout: 10_000 });
  await page.locator('.hive-question textarea').fill('Keep it as a draft');
  // Answer drafts survive a lane switch: they belong to the question, not the composer.
  await page.getByRole('tab', { name: /Ledger/ }).click();
  await page.getByRole('tab', { name: /Forge/ }).click();
  await expect(page.locator('.hive-question textarea')).toHaveValue('Keep it as a draft');
  await page.getByRole('button', { name: 'Send answer' }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Done', {
    timeout: 10_000
  });
  await expect(page.locator('.hive-artifact')).toHaveCount(1);
  await expect(page.locator('.hive-meta-line .hive-ref').first()).toHaveText(/^T-/);
  await expect(page.locator('.hive-meta-line .hive-version')).toHaveText(/^v\d+/);
  await expect(page.locator('.hive-lane-time').first()).toBeVisible();
  await expect(page.locator('.hive-task-row').first()).toContainText('T-');

  // Artifact export is a local download; no network leaves the page.
  const artifactDownload = page.waitForEvent('download');
  await page.locator('.hive-artifact').getByRole('button', { name: 'Export', exact: true }).click();
  const artifactFile = await artifactDownload;
  expect(artifactFile.suggestedFilename()).toMatch(/\.txt$/);

  // Shared memory: the lane remembers the run, and a cut-off hides older entries from reuse.
  await page.getByRole('tab', { name: 'Memory', exact: true }).click();
  await expect(page.locator('.hive-memory-row').first()).toBeVisible();
  await expect(page.locator('.hive-memory-head')).toContainText('in use');
  await page.getByRole('button', { name: 'Cut off here' }).first().click();
  await expect(page.locator('.hive-memory-row.is-cut').first()).toBeVisible();
  await page.getByRole('button', { name: 'Restore all' }).click();
  await expect(page.locator('.hive-memory-row.is-cut')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();

  // Activity lane: the run is logged, counts as unread until the feed is opened, and older
  // entries are not silently implied — the feed is a bounded cursor log.
  await expect(page.locator('.hive-lane .hive-unread').first()).toBeVisible();
  await page.getByRole('tab', { name: /Activity/ }).click();
  await expect(page.locator('.hive-activity-row').first()).toBeVisible();
  await expect(page.getByText('Done ·', { exact: false }).first()).toBeVisible();
  await expect(page.locator('.hive-lane .hive-unread')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click();
  await expect(page.locator('.hive-task-row').first()).toBeVisible();

  // Versioned store: export produces a portable backup and importing it restores the same state.
  const downloadPromise = page.waitForEvent('download');
  await page.locator('.hive').getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^digitalmate-hive-.*\.json$/);
  const backupPath = await download.path();
  expect(backupPath).toBeTruthy();
  await page.locator('.hive input[type="file"][accept*="json"]').setInputFiles(backupPath!);
  await expect(page.getByText('Hive backup imported.')).toBeVisible();
  await expect(page.locator('.hive-task-row').first()).toBeVisible();
});

test('a bridged build talks to the reference bridge', async ({ page }) => {
  const bridged = 'http://127.0.0.1:5176';
  await page.goto(`${bridged}/`);
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();

  await expect(page.locator('.hive-live')).toContainText('Hive bridge');
  await expect(page.locator('.hive-diagnostics')).toContainText('Contract v1');

  await page.getByRole('tab', { name: /Forge/ }).click();
  await page.locator('.hive-composer input[type="file"]').setInputFiles({
    name: 'pixel.png',
    mimeType: 'image/png',
    buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  });
  await page.locator('.hive-composer textarea').fill('E2E bridged task');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Done', { timeout: 20_000 });
  // The output is the bridge's, not the local mock's.
  await expect(page.locator('.hive-output').first()).toContainText('Bridge finished');
  // The reader's lane survives the snapshots the bridge keeps pushing.
  await expect(page.locator('.hive-composer-head')).toContainText('Forge');
  await expect(page.locator('.hive-detail h3')).toContainText('E2E bridged task');

  // Attachment bytes went to the bridge and come back for a preview.
  await expect(page.locator('.hive-attachments .hive-attachment-open')).toHaveCount(1);
  await page.locator('.hive-attachments .hive-attachment-open').first().click();
  await expect(page.locator('.hive-preview img')).toBeVisible();
  await expect(page.locator('.hive-preview img')).toHaveAttribute('src', /\/api\/hive\/attachment\//);
  await page.locator('.hive-preview').getByRole('button', { name: 'Close' }).click();
  await expect(page.locator('.hive-preview')).toHaveCount(0);
});

test('a shared link lands in a Hive draft and is consumed once', async ({ page }) => {
  await page.goto('/?title=Launch%20notes&text=Read%20this&url=https%3A%2F%2Fexample.com%2Fx');
  await expect(page.locator('.hive')).toBeVisible();
  await expect(page.locator('.hive-composer textarea')).toHaveValue(/Launch notes/);
  await expect(page.locator('.hive-composer textarea')).toHaveValue(/example\.com\/x/);
  // The share params are dropped so a reload cannot seed the draft twice.
  expect(new URL(page.url()).search).toBe('');

  await page.reload();
  await expect(page.locator('.hive')).toHaveCount(0);
});

test('the Hive demo keeps working offline', async ({ page, context }) => {
  await page.goto('/');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  await context.setOffline(true);
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await page.getByRole('tab', { name: /Forge/ }).click();
  await page.locator('.hive-composer textarea').fill('Summarise the offline mode');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Done', { timeout: 10_000 });
  await context.setOffline(false);
});

test('a shared file lands in a Hive draft', async ({ page }) => {
  await page.goto('/');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  // The service worker fills this inbox on a POST share; seed it directly to test the page half.
  await page.evaluate(async () => {
    const cache = await caches.open('digitalmate-share');
    const origin = location.origin;
    await cache.put(
      new URL('/__share/meta', origin).href,
      new Response(
        JSON.stringify({
          text: 'Shared from Android',
          files: [{ index: 0, name: 'shot.png', size: 8, type: 'image/png' }]
        }),
        { headers: { 'content-type': 'application/json' } }
      )
    );
    await cache.put(
      new URL('/__share/file/0/shot.png', origin).href,
      new Response(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: 'image/png' }))
    );
  });
  await page.reload();

  await expect(page.locator('.hive')).toBeVisible();
  await expect(page.locator('.hive-composer textarea')).toHaveValue(/Shared from Android/);
  await expect(page.locator('.hive-attachment-name')).toContainText('shot.png');

  // The inbox is consumed once: a second load starts clean.
  await page.reload();
  await expect(page.locator('.hive')).toHaveCount(0);
});

test('a build can turn Hive off and shared text falls back to chat', async ({ page }) => {
  await page.goto('/?hive=off');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.getByRole('button', { name: /Hive/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Skill center/ })).toBeVisible();
  await page.locator('.sheet-head .icon-button').click();

  await page.goto('/?hive=off&title=Note&text=Read%20this');
  await expect(page.locator('.composer-wrap textarea')).toHaveValue(/Read this/);
  await expect(page.locator('.hive')).toHaveCount(0);
});

test('Hive opens and renders a long feed within budget', async ({ page }) => {
  await page.goto('/');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  // Seed once so the store exists, then fatten it with 60 tasks and 60 activity entries.
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await expect(page.locator('.hive')).toBeVisible();
  await page.getByRole('tab', { name: /Forge/ }).click();
  await page.locator('.hive-composer textarea').fill('Perf seed task');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  // The store is written on the first mutation, not on open.
  await expect.poll(async () => page.evaluate(() => localStorage.getItem('digitalmate.hive.v2') !== null)).toBe(true);
  await page.locator('.sheet-head .icon-button').click();

  await page.evaluate(() => {
    const raw = localStorage.getItem('digitalmate.hive.v2');
    if (!raw) throw new Error('hive store missing');
    const backup = JSON.parse(raw);
    const laneId = 'forge';
    const now = Date.now();
    backup.snapshot.tasks = Array.from({ length: 60 }, (_, index) => ({
      id: `perf_task_${index}`,
      laneId,
      title: `Perf task ${index}`,
      prompt: `Perf task ${index}`,
      status: index % 7 === 0 ? 'running' : 'done',
      step: 'Done',
      output: 'ok',
      steering: [],
      attachments: [],
      createdAt: now - index * 60_000,
      updatedAt: now - index * 60_000,
      artifacts: []
    }));
    backup.snapshot.activity = Array.from({ length: 60 }, (_, index) => ({
      id: `perf_act_${index}`,
      laneId,
      taskId: `perf_task_${index}`,
      kind: 'task_status',
      text: `Done · Perf task ${index}`,
      at: now - index * 60_000
    }));
    backup.snapshot.activityTrimmed = true;
    backup.snapshot.memory = [];
    backup.snapshot.selectedLaneId = laneId;
    backup.snapshot.selectedTaskId = '';
    localStorage.setItem('digitalmate.hive.v2', JSON.stringify(backup));
  });
  await page.reload();
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }

  const openedAt = Date.now();
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await expect(page.locator('.hive')).toBeVisible();
  await expect(page.locator('.hive-task-row').first()).toBeVisible();
  const openMs = Date.now() - openedAt;

  const activityAt = Date.now();
  await page.getByRole('tab', { name: /Activity/ }).click();
  await expect(page.locator('.hive-activity-row')).toHaveCount(60);
  const activityMs = Date.now() - activityAt;

  // Budgets are deliberately generous so slow CI runners do not flake, but they still catch a
  // regression that makes the sheet hang or the feed render per-row synchronously.
  console.log(`[hive-perf] open=${openMs}ms activity=${activityMs}ms rows=60`);
  expect(openMs).toBeLessThan(2500);
  expect(activityMs).toBeLessThan(1500);
});

test('notifies when a Bee finishes with the sheet closed, and a tap opens the task', async ({ page }) => {
  await page.addInitScript(() => {
    class FakeNotification {
      static permission = 'granted';
      static requestPermission = async (): Promise<string> => 'granted';
      onclick: (() => void) | null = null;
      constructor(public title: string, public options?: { body?: string }) {
        const store = window as unknown as {
          __hiveNotifications?: Array<{ title: string; body?: string; instance: FakeNotification }>;
        };
        store.__hiveNotifications = store.__hiveNotifications ?? [];
        store.__hiveNotifications.push({ title, body: options?.body, instance: this });
      }
      close(): void {}
    }
    // @ts-expect-error test stub replaces the platform API
    window.Notification = FakeNotification;
  });
  await page.goto('/');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await page.getByRole('tab', { name: /Forge/ }).click();
  await page.locator('.hive-composer textarea').fill('Build an artifact for the launch');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  // Background work only notifies while the sheet is closed.
  await page.locator('.sheet-head .icon-button').click();

  await expect
    .poll(async () => page.evaluate(() => {
      const store = window as unknown as { __hiveNotifications?: unknown[] };
      return store.__hiveNotifications?.length ?? 0;
    }), { timeout: 10_000 })
    .toBeGreaterThan(0);
  const notice = await page.evaluate(() => {
    const store = window as unknown as {
      __hiveNotifications?: Array<{ title: string; body?: string }>;
    };
    return store.__hiveNotifications?.[0] ?? null;
  });
  expect(notice?.title).toContain('Forge');

  await page.evaluate(() => {
    const store = window as unknown as {
      __hiveNotifications?: Array<{ instance: { onclick: (() => void) | null } }>;
    };
    store.__hiveNotifications?.[0]?.instance.onclick?.();
  });
  await expect(page.locator('.hive')).toBeVisible();
  await expect(page.locator('.hive-detail h3')).toContainText('Build an artifact');
});

test('shows failed and queued Bee states', async ({ page }) => {
  await page.goto('/');
  if (await page.getByText('Start with a real task').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Skip' }).click();
  }
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();

  // `!fail` is the documented way to reach the error state in the local demo.
  await page.getByRole('tab', { name: /Ledger/ }).click();
  await page.locator('.hive-composer textarea').fill('!fail Build the weekly numbers');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Failed', { timeout: 10_000 });
  await expect(page.locator('.hive-output').first()).toContainText('could not finish');

  // A second request while one is running is queued, not dropped.
  await page.getByRole('tab', { name: /Forge/ }).click();
  await page.locator('.hive-composer textarea').fill('Build an artifact one');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await page.locator('.hive-composer textarea').fill('Build an artifact two');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-status.is-queued').first()).toBeVisible({ timeout: 10_000 });
});

test('stops a Bee only after confirming', async ({ page }) => {  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Hive/ }).click();
  await page.getByRole('tab', { name: /Ledger/ }).click();
  await page.locator('.hive-composer textarea').fill('Draft an email to Carol about the contract');
  await page.locator('.hive-actions').getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('.hive-question')).toBeVisible({ timeout: 10_000 });

  // Stop is destructive: the first press asks, and cancelling leaves the Bee waiting.
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(page.getByText('Stop this task?')).toBeVisible();
  await page.getByRole('button', { name: 'Keep working' }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Needs you');

  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByRole('button', { name: 'Stop task' }).click();
  await expect(page.locator('.hive-detail .hive-status').first()).toContainText('Stopped');
});

test('core screens have no serious accessibility violations', async ({ page }) => {  test.setTimeout(120_000);
  const scan = async (label: string) => {
    const result = await new AxeBuilder({ page }).analyze();
    const issues = result.violations
      .filter(violation => violation.impact === 'critical' || violation.impact === 'serious')
      .map(violation => ({ id: violation.id, targets: violation.nodes.map(node => node.target) }));
    expect(issues, label).toEqual([]);
  };

  await scan('home');
  await sendMessage(page, 'Find coffee nearby');
  await expect(page.locator('.a2ui-surface')).toBeVisible();
  await scan('chat');

  await page.getByRole('button', { name: 'Discover' }).click();
  await scan('discover');
  await page.locator('.feed-cover-button').first().click();
  await expect(page.locator('.detail-layer')).toBeVisible();
  await scan('discover detail');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.locator('.detail-layer')).toHaveCount(0);

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await scan('more');
  await page.getByRole('button', { name: /Skill center/ }).click();
  await scan('skills');
  await page.locator('.sheet-head .icon-button').click();

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await scan('settings');
});

test('home and settings have no critical accessibility violations', async ({ page }) => {
  test.setTimeout(90_000);
  const home = await new AxeBuilder({ page }).include('main').analyze();
  expect(home.violations.filter(violation => violation.impact === 'critical')).toEqual([]);

  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: /Settings/ }).click();
  await expect(page.locator('.sheet-panel')).toBeFocused();
  await expect(page.locator('.sheet-layer')).toBeVisible();
  const settings = await new AxeBuilder({ page }).include('.sheet-layer').analyze();
  expect(settings.violations.filter(violation => violation.impact === 'critical')).toEqual([]);

  await page.keyboard.press('Escape');
  await expect(page.locator('.sheet-layer')).toHaveCount(0);
});
