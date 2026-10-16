// Synthetic, isolated development browser acceptance; never run against company data.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';

const base = 'http://127.0.0.1:3100';
const output = '.local-dev/ux-13e';
const database = new URL(process.env.DATABASE_URL);
assert(database.hostname === '127.0.0.1' && database.port === '55432' && database.pathname.endsWith('_development'));
const db = new pg.Client({ connectionString: database.href });
await db.connect();
const fixture = (await db.query(`SELECT t.id FROM product_templates t JOIN organizations o ON o.id=t.organization_id JOIN product_template_versions v ON v.template_id=t.id WHERE o.name='Kit Builder Development' AND v.name LIKE 'Browser acceptance Science%' AND v.status='draft' ORDER BY t.created_at DESC LIMIT 1`)).rows[0];
assert(fixture, 'An existing synthetic browser draft is required');
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--no-sandbox'] });
const report = { checks: [], audits: [], errors: [], layouts: [] };
try {
  await mkdir(output, { recursive: true });
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const account = accounts.find(a => a.role === 'staff' && a.organization === 'Kit Builder Development');
  assert(account);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(base);
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  const url = `${base}/?tab=product_library&studio=${fixture.id}`;
  if (process.argv.includes('--rollback')) {
    await page.goto(`${base}/?tab=product_library`);
    await expect(page.getByRole('link', { name: 'Open Kit Studio', exact: true })).toHaveCount(0);
    await page.getByRole('button').filter({ has: page.getByRole('heading', { name: /Browser acceptance Science/ }) }).first().click();
    const saved = (await db.query('SELECT description FROM product_template_versions WHERE template_id=$1 AND status=$2', [fixture.id, 'draft'])).rows[0];
    await expect(page.getByLabel('Description (optional)')).toHaveValue(saved.description);
    await page.goto(url);
    await expect(page.getByRole('alert')).toBeVisible();
    report.checks.push('Flag-off hides entry, rejects direct Studio navigation, preserves saved draft in legacy editor');
  } else {
  await page.goto(url);
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  const stale = await context.newPage();
  await stale.goto(url);
  await stale.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await stale.getByLabel('Description (optional)').fill('Stale browser edit must never overwrite');
  const description = `13E persistence ${Date.now()}`;
  await page.getByLabel('Description (optional)').fill(description);
  await page.getByLabel('box name', { exact: true }).first().fill('13E verified box');
  const quantity = page.getByRole('spinbutton', { name: /Browser material .* required quantity/ });
  await quantity.fill('0.375');
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeEnabled();
  assert.equal(await page.getByRole('button', { name: /Approve|Publish|Archive/ }).count(), 0);
  page.once('dialog', dialog => { assert.equal(dialog.type(), 'confirm'); return dialog.dismiss(); });
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await expect(page.getByLabel('Description (optional)')).toHaveValue(description);
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('link', { name: 'Return to existing Kit Builder' }).click();
  await expect(page.getByLabel('Description (optional)')).toHaveValue(description);
  report.checks.push('Explicit dirty state, cancel close/navigation, no approval/publishing/archive controls');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await stale.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(stale.getByText('Another editor changed this draft.', { exact: false })).toBeVisible();
  await expect(stale.getByLabel('Description (optional)')).toHaveValue('Stale browser edit must never overwrite');
  await expect(stale.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await stale.screenshot({ path: `${output}/stale-conflict.png`, fullPage: true });
  stale.once('dialog', dialog => dialog.accept());
  await stale.getByRole('button', { name: 'Close editor', exact: true }).click();
  await stale.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await expect(stale.getByLabel('Description (optional)')).toHaveValue(description);
  report.checks.push('Two real tabs: stale save rejected, local values retained, discard/reopen recovers latest');
  await page.reload();
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await expect(page.getByLabel('Description (optional)')).toHaveValue(description);
  await expect(page.getByRole('spinbutton', { name: /Browser material .* required quantity/ })).toHaveValue('0.375');
  await expect(page.getByLabel('box name', { exact: true }).first()).toHaveValue('13E verified box');
  report.checks.push('Save/reload/reopen preserves description, exact material quantity and physical box');
  await page.getByText('Saved revision history', { exact: true }).click();
  await page.getByRole('combobox', { name: /Compare an earlier revision/ }).selectOption({ index: 1 });
  await expect(page.getByRole('region', { name: 'Saved revision comparison' })).toContainText('changed fields');
  const summary = page.locator('.studio-editor details > summary').first();
  await summary.focus(); await page.keyboard.press('Space');
  await expect(summary.locator('..')).not.toHaveAttribute('open');
  await page.keyboard.press('Enter');
  await expect(summary.locator('..')).toHaveAttribute('open', '');
  report.checks.push('Saved revision comparison and keyboard activity/grade disclosures');
  const axe = await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js', 'utf8');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['reflow', 390, 844]]) {
    await page.setViewportSize({ width, height });
    const save = page.getByRole('button', { name: 'Save draft', exact: true });
    await save.scrollIntoViewIfNeeded();
    assert(await save.evaluate(button => {
      const r = button.getBoundingClientRect();
      return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
    }), `${name} save control obscured`);
    await page.screenshot({ path: `${output}/${name}-savebar.png` });
    await page.getByRole('heading', { name: 'Kit Studio', exact: true }).scrollIntoViewIfNeeded();
    await page.addScriptTag({ content: axe });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run('.live-studio', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
      return { violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), passes: result.passes.length };
    });
    report.audits.push({ name, ...audit });
    const layout = await page.locator('.live-studio').evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth }));
    report.layouts.push({ name, ...layout });
    await page.screenshot({ path: `${output}/${name}-editing.png`, fullPage: true });
    assert(layout.scrollWidth <= layout.width + 1, `${name} overflow`);
    assert.equal(audit.violations.length, 0, `${name} axe violations`);
    assert.equal(audit.incomplete.length, 0, `${name} unresolved axe checks`);
  }
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await page.getByRole('link', { name: 'Return to existing Kit Builder' }).click();
  await expect(page.getByRole('heading', { name: 'Product Library', exact: true })).toBeVisible();
  await page.getByRole('button').filter({ has: page.getByRole('heading', { name: /Browser acceptance Science/ }) }).first().click();
  await expect(page.getByLabel('Description (optional)')).toHaveValue(description);
  report.checks.push('Legacy editor reads the same saved draft');
  assert.deepEqual(report.errors, []);
  }
} finally {
  await writeFile(`${output}/${process.argv.includes('--rollback') ? 'rollback' : 'browser'}-report.json`, JSON.stringify(report, null, 2));
  await browser.close(); await db.end();
}
console.log(JSON.stringify(report));
