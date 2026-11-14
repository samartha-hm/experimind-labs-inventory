// Isolated development acceptance only; uses existing private pilot accounts.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';

const base = 'http://127.0.0.1:3100';
const output = '.local-dev/ux-13d';
const database = new URL(process.env.DATABASE_URL);
assert(['127.0.0.1', 'localhost'].includes(database.hostname) && database.port === '55432');
assert(/development|test/.test(database.pathname), 'Only isolated development databases are allowed');
const db = new pg.Client({ connectionString: database.href });
await db.connect();
const tables = ['product_templates', 'product_template_versions', 'product_template_revisions', 'kit_template_approvals', 'inventory_items', 'stock_ledger'];
async function fingerprint() {
  await db.query('BEGIN READ ONLY');
  try {
    const result = {};
    for (const table of tables) result[table] = (await db.query(`SELECT md5(COALESCE(jsonb_agg(row_data ORDER BY row_data::text)::text, '[]')) AS hash FROM (SELECT to_jsonb(t) AS row_data FROM ${table} t) rows`)).rows[0].hash;
    return result;
  } finally { await db.query('ROLLBACK'); }
}
const report = { checks: [], audits: [], layouts: [], timings: [], mutations: [], authenticationRefreshes: 0, errors: [] };
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--no-sandbox'] });
try {
  await mkdir(output, { recursive: true });
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const account = accounts.find(a => a.role === 'staff' && a.organization === 'Kit Builder Development');
  assert(account, 'Existing private development account required');
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('requestfinished', async request => {
    if (request.url().includes('/api/v1/product-templates/') && request.method() === 'GET') report.timings.push({ path: new URL(request.url()).pathname, status: (await request.response())?.status(), milliseconds: request.timing().responseEnd });
  });
  await page.goto(base);
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  const before = await fingerprint();
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/auth/refresh-token' && request.method() === 'POST') { report.authenticationRefreshes++; return; }
    if (request.url().startsWith(base + '/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) report.mutations.push({ path: new URL(request.url()).pathname, method: request.method() });
  });
  await page.goto(base + '/?tab=product_library');
  await expect(page.getByRole('link', { name: 'Open read-only Kit Studio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Kit Studio', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${output}/automated-before.png`, fullPage: true });
  await page.getByRole('link', { name: 'Open read-only Kit Studio' }).click();
  await expect(page.locator('.live-catalog')).toBeVisible();
  await page.locator('.live-catalog a').filter({ hasText: 'Browser acceptance Science' }).first().click();
  await expect(page.getByRole('combobox', { name: 'Saved snapshot' })).toBeVisible();
  const detailURL = page.url();
  report.checks.push('Authenticated default builder, opt-in catalog and persisted detail');
  const snapshot = page.getByRole('combobox', { name: 'Saved snapshot' });
  await snapshot.selectOption({ label: 'Approved immutable version 2 · revision 1' });
  await expect(page.locator('.live-studio')).toContainText('published');
  await snapshot.selectOption({ label: 'Current draft · v1 · revision 2' });
  await expect(page.locator('.live-studio')).toContainText('draft');
  const disclosure = page.locator('.live-studio details').first();
  await disclosure.locator(':scope > summary').focus();
  await page.keyboard.press('Space');
  await expect(disclosure).not.toHaveAttribute('open');
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  report.checks.push('Keyboard disclosure and immutable snapshot selection');
  const axe = await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js', 'utf8');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['reflow', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.addScriptTag({ content: axe });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run('.live-studio', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
      return { violations: result.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), passes: result.passes.length };
    });
    report.audits.push({ name, ...audit });
    const layout = await page.locator('.live-studio').evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, columns: getComputedStyle(element.querySelector('.live-columns')).gridTemplateColumns }));
    report.layouts.push({ name, ...layout });
    assert(layout.scrollWidth <= layout.width + 1, `${name} studio overflow`);
    assert.equal(audit.violations.length, 0, `${name} accessibility violations`);
    assert.equal(audit.incomplete.length, 0, `${name} unresolved accessibility checks`);
    await page.screenshot({ path: `${output}/${name}-studio.png`, fullPage: true });
  }
  await page.getByRole('link', { name: 'Return to existing Kit Builder' }).click();
  await expect(page.getByRole('heading', { name: 'Kit Studio', exact: true })).toHaveCount(0);
  report.checks.push('Reliable return to existing builder');
  await page.goto(detailURL);
  await expect(page.getByRole('combobox', { name: 'Saved snapshot' })).toBeVisible();
  await page.route('**/api/v1/product-templates/*/studio', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Acceptance outage' }) }));
  await page.getByRole('button', { name: 'Refresh live data' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Saved snapshot' })).toHaveCount(0);
  report.checks.push('API outage hides data, exposes explicit error without fallback');
  assert.deepEqual(await fingerprint(), before, 'No operational database changes');
  assert.deepEqual(report.mutations, [], 'No operational mutation requests');
  assert.deepEqual(report.errors, [], 'No browser runtime errors');
  report.checks.push('Database fingerprints unchanged; no HTTP mutations or browser errors');
} finally {
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await db.end();
}
console.log(JSON.stringify(report));
