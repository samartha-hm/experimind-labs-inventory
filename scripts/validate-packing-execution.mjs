// Controlled browser writes: create a dedicated synthetic fixture before taking the ledger baseline.
import { chromium, expect as baseExpect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const expect = baseExpect.configure({ timeout: 20000 });

const database = new URL(process.env.DATABASE_URL);
assert(database.hostname === '127.0.0.1' && database.port === '55432' && database.pathname === '/experimind_kitbuilder_development');
const base = 'http://127.0.0.1:3101', output = '.local-dev/ux-13h';
const db = new pg.Client({ connectionString: database.href }); await db.connect();
await mkdir(output, { recursive: true });
const report = { checks: [], audits: [], layouts: [], errors: [] };
const fingerprint = async () => {
  const result = {};
  for (const table of ['inventory_items', 'stock_ledger', 'project_stock_reservations', 'packing_picks', 'planning_projects', 'planning_sites', 'product_template_versions']) {
    result[table] = (await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY id),'')) hash FROM ${table} t`)).rows[0];
  }
  return result;
};
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--no-sandbox'] });
try {
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const staff = accounts.find(a => a.role === 'staff' && a.organization === 'Kit Builder Development');
  const admin = accounts.find(a => a.role === 'admin' && a.organization === 'Kit Builder Development');
  assert(staff && admin, 'Only explicitly synthetic development accounts permitted');
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => { if (e.message !== 'WebSocket closed without opened.') report.errors.push(e.message); });
  const login = await page.request.post(`${base}/api/v1/auth/login`, { data: { email: admin.email, password: admin.password } });
  assert.equal(login.status(), 200); const administrator = await login.json();
  const api = async (method, path, body, token = administrator.token) => {
    const response = await page.request.fetch(`${base}/api/v1/packing${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Idempotency-Key': randomUUID() }, ...(body ? { data: body } : {}) });
    assert(response.ok(), `${method} ${path}: ${response.status()} ${await response.text()}`); return response.json();
  };
  // Prove the setup material belongs to the synthetic tenant and has an explicit synthetic name.
  const item = (await db.query(`SELECT i.id, i.unit FROM inventory_items i JOIN organizations o ON o.id=i.organization_id WHERE o.name=$1 AND i.name LIKE 'Browser material %' ORDER BY i.id LIMIT 1`, ['Kit Builder Development'])).rows[0];
  assert(item, 'Synthetic setup material required');
  let fixture = await api('POST', '/orders', { batch_code: `13H-SYNTHETIC-${Date.now()}`, manual: { name: '13H synthetic browser evidence only', materials: [{ item_id: item.id, quantity: '1', unit: item.unit }] } });
  fixture = await api('POST', `/orders/${fixture.id}/release`, { revision: fixture.revision });
  assert(fixture.batch_code.startsWith('13H-SYNTHETIC-') && fixture.status === 'packing');
  const pkg = fixture.snapshot.packages.at(-1); assert(pkg);
  report.fixture = { order: fixture.id, package: pkg.id, batch: fixture.batch_code };
  report.before = await fingerprint();
  report.orderBefore = await api('GET', `/orders/${fixture.id}`);
  await page.goto(base);
  await page.locator('input[type=email]').fill(staff.email); await page.locator('input[type=password]').fill(staff.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('experimind_auth_token'));
  const actor = (await api('GET', '/workspace', undefined, token)).user_id;
  assert(actor, 'Authenticated operator identity required'); report.actor = actor;
  const detail = () => api('GET', `/orders/${fixture.id}`, undefined, token);
  await page.goto(`${base}/?packing_workspace=1`);
  const workspace = page.getByRole('region', { name: 'Packing QC workspace', exact: true });
  const execution = page.getByRole('region', { name: 'Packing execution', exact: true });
  const scan = workspace.getByLabel('Scan or enter package label');
  await scan.fill(pkg.code); await scan.press('Enter');
  await expect(workspace.getByRole('region', { name: 'Selected package', exact: true })).toContainText(pkg.code);
  await expect(execution.getByRole('button', { name: 'Prepare package action' })).toBeDisabled();
  const prepare = async (action, reason) => {
    await execution.getByLabel('Package action', { exact: true }).selectOption(action);
    await execution.getByLabel('Operator evidence / exception or correction reason (required)', { exact: true }).fill(reason);
    await execution.getByRole('button', { name: 'Prepare package action', exact: true }).click();
    await expect(execution.getByRole('button', { name: 'Confirm and save package action', exact: true })).toBeDisabled();
    await execution.getByRole('checkbox').check();
  };
  const confirm = () => execution.getByRole('button', { name: 'Confirm and save package action', exact: true }).click();
  const saved = () => expect(execution.getByRole('status').filter({ hasText: 'Saved and reloaded' })).toBeVisible();
  const requests = []; let lost = false;
  await page.route('**/workspace/orders/*/exceptions', async route => {
    requests.push({ key: route.request().headers()['idempotency-key'], body: route.request().postData() });
    if (!lost) { lost = true; const response = await route.fetch(); assert.equal(response.status(), 200); await route.abort('failed'); }
    else await route.continue();
  });
  await prepare('other', '13H synthetic interrupted-response exception'); await confirm();
  await expect(execution.getByRole('status')).toContainText('Pending intent retained');
  await expect(workspace.getByRole('button', { name: 'Refresh records', exact: true })).toBeDisabled();
  await page.reload(); await expect(execution.getByText(/Interrupted or unresolved intent:/)).toBeVisible();
  await execution.getByRole('button', { name: 'Retry identical pending intent', exact: true }).click(); await saved();
  assert.equal(requests.length, 2); assert.deepEqual(requests[0], requests[1]);
  let current = await detail(); assert.equal(current.order.revision, fixture.revision + 1);
  const exception = current.order.execution.exceptions.find(e => e.notes === '13H synthetic interrupted-response exception'); assert(exception);
  report.checks.push('Wedge Enter selects identity; reason and explicit acknowledgment gate save; committed response loss survives reload and replays identical key/body exactly once');
  await prepare(exception.id, '13H synthetic correction reason'); await confirm(); await saved();
  const second = await context.newPage(); await second.goto(`${base}/?packing_workspace=1`);
  const otherWorkspace = second.getByRole('region', { name: 'Packing QC workspace', exact: true });
  await otherWorkspace.getByLabel('Scan or enter package label').fill(pkg.id); await otherWorkspace.getByLabel('Scan or enter package label').press('Enter');
  await expect(otherWorkspace.getByRole('region', { name: 'Order context', exact: true })).toContainText(`order revision ${fixture.revision + 2}`);
  await prepare('undo', '13H synthetic assembly reset evidence'); await confirm(); await saved();
  await expect(otherWorkspace.getByRole('region', { name: 'Order context', exact: true })).toContainText(`order revision ${fixture.revision + 3}`);
  report.checks.push('Correction remains durable; server-confirmed assembly reset broadcasts authoritative reload across tabs');
  for (const status of [403, 409]) {
    await page.route('**/workspace/orders/*/checklist', route => route.fulfill({ status, json: { error: status === 403 ? 'Permission denied' : 'Stale revision' } }));
    await prepare('undo', `13H synthetic simulated ${status}`); await confirm();
    await expect(execution.getByRole('status')).toContainText(String(status));
    await expect(execution.getByRole('button', { name: 'Retry identical pending intent', exact: true })).toBeDisabled();
    await execution.getByRole('button', { name: 'Release intent and reconcile server history', exact: true }).click();
    await page.unroute('**/workspace/orders/*/checklist');
  }
  report.checks.push('Simulated permission and stale-version failures retain explicit unresolved intent and require reconciliation');
  const axe = await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js', 'utf8');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['reflow', 390, 844]]) {
    await page.setViewportSize({ width, height }); await page.addScriptTag({ content: axe });
    const audit = await page.evaluate(async () => {
      const a = await window.axe.run('.packing-workspace', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
      const luminance = rgb => rgb.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
      const contrast = a.incomplete.filter(v => v.id === 'color-contrast').flatMap(v => v.nodes.map(n => {
        const element = document.querySelector(n.target[0]); let parent = element;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') parent = parent.parentElement;
        const foreground = luminance(getComputedStyle(element).color), background = luminance(getComputedStyle(parent).backgroundColor);
        return { target: n.target, ratio: (Math.max(foreground, background) + .05) / (Math.min(foreground, background) + .05) };
      }));
      return { violations: a.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), incomplete: a.incomplete.map(v => v.id), contrast };
    });
    report.audits.push({ name, ...audit });
    const layout = await workspace.evaluate(e => ({ width: e.clientWidth, scrollWidth: e.scrollWidth, minTarget: Math.min(...[...e.querySelectorAll('button,input,select,textarea')].filter(n => n.getBoundingClientRect().height).map(n => n.getBoundingClientRect().height)) }));
    report.layouts.push({ name, ...layout }); await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
    assert.equal(audit.violations.length, 0, `${name} accessibility violations`); assert(audit.incomplete.every(id => id === 'color-contrast'));
    assert(audit.contrast.every(n => n.ratio >= 4.5), `${name} computed contrast`);
    assert(layout.scrollWidth <= layout.width + 1, `${name} overflow`); assert(layout.minTarget >= 48, `${name} targets`);
  }
  report.orderAfter = await detail(); report.after = await fingerprint();
  assert.deepEqual(report.before, report.after); assert.deepEqual(report.orderBefore.order.snapshot, report.orderAfter.order.snapshot);
  assert.equal(report.orderAfter.order.status, 'packing'); assert.equal(report.orderAfter.order.revision, fixture.revision + 3);
  assert.equal(report.orderAfter.history.length, report.orderBefore.history.length + 3);
  for (const [field, value] of Object.entries(report.orderBefore.order)) {
    if (!['revision', 'execution', 'updated_by', 'updated_at'].includes(field)) assert.deepEqual(report.orderAfter.order[field], value, `Unchanged ${field}`);
  }
  assert.deepEqual(report.orderAfter.order.execution.changes, report.orderBefore.order.execution.changes);
  assert.equal(report.orderAfter.order.execution.exceptions.length, 1);
  assert.equal(report.orderAfter.order.execution.progress[pkg.id].qc, 'pending');
  for (const event of report.orderAfter.history.slice(0, 3)) assert.equal(event.actor_id, actor);
  assert.equal(report.errors.length, 0);
  report.checks.push('Exactly three authorized evidence events; stock, ledger, reservations, picks, requirements, school records and approved templates unchanged');
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checks: report.checks, layouts: report.layouts, audits: report.audits, fixture: report.fixture }));
} finally { await browser.close(); await db.end(); }
