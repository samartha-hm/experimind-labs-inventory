// Read-only acceptance against existing isolated synthetic development records.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const database = new URL(process.env.DATABASE_URL);
assert(database.hostname === '127.0.0.1' && database.port === '55432' && database.pathname.endsWith('_development'));
const db = new pg.Client({ connectionString: database.href });
await db.connect();
const base = process.env.PACKING_ACCEPTANCE_URL || 'http://127.0.0.1:3101';
assert(new URL(base).hostname === '127.0.0.1');
const output = process.env.PACKING_ACCEPTANCE_13H === 'true' ? '.local-dev/ux-13h' : '.local-dev/ux-13g';
const rollback = process.env.PACKING_ACCEPTANCE_ROLLBACK === 'true';
await mkdir(output, { recursive: true });
const report = { checks: [], audits: [], layouts: [], errors: [], infrastructureErrors: [], workspaceRequests: [] };
const fingerprint = async () => {
  const rows = {};
  for (const table of ['inventory_items', 'stock_ledger', 'project_stock_reservations', 'packing_orders', 'packing_picks', 'supply_events', 'supply_operations']) rows[table] = (await db.query(`SELECT count(*)::int AS rows, md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY id), '')) AS hash FROM ${table} t`)).rows[0];
  return rows;
};
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--no-sandbox'] });
report.before = await fingerprint();
try {
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const account = accounts.find(a => a.role === 'staff' && a.organization === 'Kit Builder Development');
  assert(account);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => (e.message === 'WebSocket closed without opened.' ? report.infrastructureErrors : report.errors).push(e.message));
  page.on('request', r => { if (r.url().includes('/api/v1/packing/workspace')) report.workspaceRequests.push({ method: r.method(), path: new URL(r.url()).pathname }); });
  await page.goto(base);
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('experimind_auth_token'));
  const headers = { Authorization: `Bearer ${token}` };
  const get = async path => { const r = await page.request.get(`${base}/api/v1/packing${path}`, { headers }); assert.equal(r.status(), 200, await r.text()); return r.json(); };
  if (rollback) {
    assert.equal((await get('/workspace')).enabled, false);
    assert.equal((await page.request.get(`${base}/api/v1/packing/workspace/orders`, { headers })).status(), 404);
    const evidence = JSON.parse(await readFile(`${output}/browser-report.json`, 'utf8'));
    const fixture = evidence.fixture;
    const legacy = await get(`/orders/${fixture.order}`);
    if (evidence.orderAfter) assert.deepEqual(legacy, evidence.orderAfter, 'Flag rollback preserves saved execution evidence');
    const pkg = legacy.order.snapshot.packages.find(p => p.id === fixture.package); assert(pkg);
    await page.goto(`${base}/?packing_workspace=1&packing_package=${pkg.id}`);
    await expect(page.getByRole('region', { name: 'Packing QC workspace', exact: true })).toHaveCount(0);
    await expect(page.getByText('Packing workspace unavailable. Use the operational packing panel in Projects.')).toBeVisible();
    await expect(page.getByText(`${pkg.code} · ${pkg.name} · ${pkg.kind}`, { exact: true })).toBeVisible();
    await page.screenshot({ path: `${output}/rollback.png`, fullPage: true });
    report.checks.push('Actual server flag off: workspace API disabled; authenticated legacy QR UI reads the same package without migration');
  } else {
  const orders = await get('/workspace/orders');
  const fixture = orders.find(o => o.status === 'packing'); assert(fixture);
  const detail = await get(`/workspace/orders/${fixture.id}`);
  assert.deepEqual(detail, await get(`/orders/${fixture.id}`));
  assert.deepEqual(orders, await get('/'));
  const pkg = detail.order.snapshot.packages.find(p => p.kind === 'pouch') || detail.order.snapshot.packages.at(-1);
  assert(pkg);
  report.fixture = { order: fixture.id, package: pkg.id, packages: detail.order.snapshot.packages.length };
  await page.goto(`${base}/?packing_workspace=1`);
  const workspace = page.getByRole('region', { name: 'Packing QC workspace', exact: true });
  await expect(workspace).toBeVisible();
  await workspace.getByLabel('Project / school / batch').selectOption(fixture.id);
  await expect(workspace.getByLabel('Order context')).toContainText(fixture.batch_code);
  const scan = workspace.getByLabel('Scan or enter package label');
  const selected = workspace.getByRole('region', { name: 'Selected package', exact: true });
  for (const input of [pkg.code, pkg.id, `${base}/?packing_package=${pkg.id}`]) {
    await scan.fill(input); await scan.press('Enter');
    await expect(selected).toContainText(pkg.code);
    await expect(workspace.getByRole('status')).toContainText('Authorized order');
    await expect(scan).toBeFocused();
  }
  report.checks.push('Legacy and workspace detail/list match; PK code, UUID and same-origin QR URL via keyboard Enter resolve the same package');
  await scan.fill(randomUUID()); await scan.press('Enter');
  await expect(workspace.getByRole('alert')).toContainText('Previous selection retained');
  await expect(selected).toContainText(pkg.code);
  await page.screenshot({ path: `${output}/unknown-package.png`, fullPage: true });
  await scan.fill('https://untrusted.invalid/?packing_package=' + pkg.id); await scan.press('Enter');
  await expect(workspace.getByRole('alert')).toBeVisible();
  await expect(selected).toContainText(pkg.code);
  report.checks.push('Unknown and foreign labels fail without changing the selected package');
  await scan.fill(pkg.code); await scan.press('Enter'); await expect(workspace.getByRole('alert')).toHaveCount(0);
  await expect(workspace).toHaveAttribute('aria-busy', 'false');
  const outline = workspace.locator('.pw-outline button').last();
  await outline.focus(); await page.keyboard.press('Enter');
  await expect(selected.getByRole('heading').first()).toBeFocused();
  await workspace.getByRole('button', { name: 'Focus package scanner' }).click(); await expect(scan).toBeFocused();
  report.checks.push('Native keyboard package navigation focuses selected heading; scanner focus restored explicitly and after lookup');
  const axe = await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js', 'utf8');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['reflow', 390, 844]]) {
    await page.setViewportSize({ width, height }); await page.addScriptTag({ content: axe });
    const audit = await page.evaluate(async () => {
      const a = await window.axe.run('.packing-workspace', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
      return { violations: a.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: a.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => {
        const element = document.querySelector(n.target[0]); let parent = element;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
        return { target: n.target, color: getComputedStyle(element).color, background: parent && getComputedStyle(parent).backgroundColor, text: element.textContent };
      }) })), passes: a.passes.length };
    });
    report.audits.push({ name, ...audit });
    const layout = await workspace.evaluate(e => ({ width: e.clientWidth, scrollWidth: e.scrollWidth, minTarget: Math.min(...[...e.querySelectorAll('button,input,select')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)) }));
    report.layouts.push({ name, ...layout });
    await workspace.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    await selected.scrollIntoViewIfNeeded(); await page.screenshot({ path: `${output}/${name}-package.png`, fullPage: true });
    assert(layout.scrollWidth <= layout.width + 1, `${name} overflow`); assert(layout.minTarget >= 48);
    assert.equal(audit.violations.length, 0, `${name} axe violations`);
    assert(audit.incomplete.every(v => v.id === 'color-contrast'), `${name} unexpected unresolved axe check`);
    const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    for (const node of audit.incomplete.flatMap(v => v.nodes)) {
      const foreground = luminance(node.color), background = luminance(node.background);
      node.computedContrast = (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05);
      assert(node.computedContrast >= 4.5, 'Clipped outline text contrast');
    }
  }
  // Simulated HTTP failures are explicit UI states, never persisted operations.
  for (const [status, message] of [[403, 'Packing permission denied'], [409, 'Packing conflict; refresh before retrying'], [503, 'Service temporarily unavailable']]) {
    await page.route('**/api/v1/packing/workspace/orders/*', route => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ error: message }) }));
    await workspace.getByRole('button', { name: 'Refresh records' }).click();
    await expect(workspace.getByRole('alert')).toContainText(message);
    await expect(selected).toHaveCount(0);
    await page.unroute('**/api/v1/packing/workspace/orders/*');
    await workspace.getByRole('button', { name: 'Refresh records' }).click();
    await expect(workspace).toHaveAttribute('aria-busy', 'false');
    await workspace.getByLabel('Project / school / batch').selectOption(fixture.id);
    await expect(selected).toBeVisible();
  }
  report.checks.push('Simulated permission, conflict and service failures clear stale detail; recovery reloads authoritative records');
  await page.route('**/api/v1/packing/workspace/orders', route => route.fulfill({ json: [] }));
  await workspace.getByRole('button', { name: 'Refresh records' }).click();
  await expect(workspace.getByText('No authorized packing orders available.')).toBeVisible();
  await page.unroute('**/api/v1/packing/workspace/orders');
  await page.route('**/api/v1/packing/workspace', route => route.fulfill({ json: { enabled: false } }));
  await page.reload(); await expect(workspace).toHaveCount(0);
  await expect(page.getByText('Packing workspace unavailable. Use the operational packing panel in Projects.')).toBeVisible();
  report.checks.push('Empty queue and simulated flag-off UI fallback; actual server flag/role/tenant rollback covered by PostgreSQL HTTP integration');
  }
  assert(report.workspaceRequests.every(r => r.method === 'GET'));
  assert.deepEqual(report.errors, []);
  report.after = await fingerprint(); assert.deepEqual(report.after, report.before);
  report.checks.push('Every workspace request GET; inventory, reservation, packing/QC, ledger and supply-operation fingerprints identical');
} finally {
  await writeFile(`${output}/${rollback ? 'rollback-report' : 'browser-report'}.json`, JSON.stringify(report, null, 2));
  await browser.close(); await db.end();
}
console.log(JSON.stringify({ checks: report.checks, audits: report.audits, layouts: report.layouts, errors: report.errors }));
