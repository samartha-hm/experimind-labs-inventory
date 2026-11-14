// Isolated synthetic development acceptance only; never point at company data.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const database = new URL(process.env.DATABASE_URL);
assert(database.hostname === '127.0.0.1' && database.port === '55432' && database.pathname.endsWith('_development'));
const db = new pg.Client({ connectionString: database.href });
await db.connect();
const fixture = (await db.query(`SELECT t.id FROM product_templates t JOIN organizations o ON o.id=t.organization_id JOIN product_template_versions v ON v.template_id=t.id WHERE o.name='Kit Builder Development' AND v.name LIKE 'Browser acceptance Science%' AND v.status='draft' ORDER BY t.created_at DESC LIMIT 1`)).rows[0];
assert(fixture, 'Existing synthetic browser draft required');
const output = '.local-dev/ux-13f';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, ignoreDefaultArgs: ['--no-sandbox'] });
const report = { checks: [], audits: [], layouts: [], errors: [], timings: {} };
const fingerprint = async () => Object.fromEntries(await Promise.all(['inventory_items', 'stock_ledger', 'project_stock_reservations'].map(async table => [table, (await db.query(`SELECT count(*)::int AS rows, md5(coalesce(string_agg(row_to_json(t)::text, '' ORDER BY id), '')) AS hash FROM ${table} t`)).rows[0]])));
report.before = await fingerprint();
try {
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const account = accounts.find(a => a.role === 'staff' && a.organization === 'Kit Builder Development');
  assert(account);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto('http://127.0.0.1:3100');
  await page.locator('input[type=email]').fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('experimind_auth_token'));
  const headers = { Authorization: `Bearer ${token}` };
  const existing = await (await page.request.get(`http://127.0.0.1:3100/api/v1/product-templates/${fixture.id}/studio`, { headers })).json();
  const reference = existing.draft.subjects.flatMap(s => s.grades.flatMap(g => g.activities.flatMap(a => a.materials)))[0];
  assert(reference?.inventory_item_id);
  const items = (await db.query('SELECT id, name FROM inventory_items WHERE organization_id=$1 ORDER BY id LIMIT 6', [existing.draft.organization_id])).rows;
  assert.equal(items.length, 6);
  const subjects = ['Science', 'Mathematics'].map(name => ({ id: randomUUID(), name, grades: ['8', '9', '10'].map(name => {
    const activities = Array.from({ length: 10 }, (_, index) => ({ id: randomUUID(), name: `Investigation ${index + 1} with long descriptive STEM activity title`, materials: items.map(item => ({ ...reference, id: randomUUID(), inventory_item_id: item.id, item_name: `${item.name} precision experimental material with long label`, quantity: 0.125 })) }));
    return { id: randomUUID(), name, activities, packing: [{ id: randomUUID(), kind: 'box', name: 'Grade box', activity_ids: [], inventory_item_ids: [], children: [{ id: randomUUID(), kind: 'partition', name: 'Activity partition', activity_ids: [], inventory_item_ids: [], children: [{ id: randomUUID(), kind: 'pouch', name: 'Shared pouch across all activities', activity_ids: activities.map(a => a.id), inventory_item_ids: items.map(item => item.id), children: [] }] }] }] };
  }) }));
  subjects[0].crates = [
    ...subjects[0].grades.map(g => ({ id: randomUUID(), name: `Science ${g.name} common crate`, kind: 'common', rule: { kind: 'selected_sets', components: [{ subject_id: subjects[0].id, grade_id: g.id, quantity: 1 }] }, materials: [{ ...reference, id: randomUUID(), quantity: 0.375 }] })),
    { id: randomUUID(), name: 'Science Grades 8–10 universal crate', kind: 'universal', rule: { kind: 'complete_sets', components: subjects[0].grades.map(g => ({ subject_id: subjects[0].id, grade_id: g.id, quantity: 1 })) }, materials: [{ ...reference, id: randomUUID(), quantity: 0.125 }] },
  ];
  const created = await page.request.post('http://127.0.0.1:3100/api/v1/product-templates', { headers, data: { name: `13F complex STEM ${Date.now()}`, subjects } });
  assert.equal(created.status(), 201, await created.text());
  fixture.id = (await created.json()).template_id;
  const start = performance.now();
  await page.goto(`http://127.0.0.1:3100/?tab=product_library&studio=${fixture.id}`);
  const review = page.getByRole('region', { name: 'Lifecycle review' });
  await expect(review).toBeVisible();
  report.timings.openSavedReviewMs = Math.round(performance.now() - start);
  report.fixtureSummary = await review.locator('p').first().innerText();
  // Make a distinct revision so reruns exercise a fresh approval without deleting data.
  await page.getByRole('button', { name: 'Edit draft', exact: true }).click();
  await page.getByLabel('Description (optional)').fill(`13F lifecycle acceptance ${Date.now()}`);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Draft saved' })).toBeVisible();
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  const trigger = page.getByRole('button', { name: 'Review and approve saved revision', exact: true });
  await expect(trigger).toBeEnabled();
  await page.getByText(/Inspect completeness and packing guidance/).click();
  const warning = review.getByRole('button', { name: /Warning:/ }).first();
  await warning.click();
  assert(await page.evaluate(() => document.activeElement?.id.startsWith('review-')));
  await review.scrollIntoViewIfNeeded();
  for (const subject of subjects) for (const grade of subject.grades) await page.getByRole('spinbutton', { name: `${subject.name} / ${grade.name} sets`, exact: true }).fill('1');
  await page.getByRole('spinbutton', { name: 'Science Grades 8–10 universal crate: explicit complete sets' }).fill('1');
  await page.getByRole('button', { name: 'Calculate preview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inventory requirements', exact: true })).toBeVisible();
  report.checks.push('Clickable packing warning focuses physical location; explicit Science/Math and complete-set server quantity preview');
  await trigger.focus(); await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Cancel approval' })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(trigger).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Confirm immutable approval' })).toBeFocused();
  await page.screenshot({ path: `${output}/desktop-confirmation.png` });
  const approveStart = performance.now();
  await page.keyboard.press('Enter');
  await expect(page.getByText('This saved draft revision already has an approved snapshot.', { exact: false })).toBeVisible();
  report.timings.approveAndRefreshMs = Math.round(performance.now() - approveStart);
  report.checks.push('Explicit saved-revision approval, Cancel autofocus, Escape return, Tab confirmation, server refresh, duplicate disabled');
  const selector = page.getByRole('combobox', { name: 'Saved snapshot', exact: true });
  const approved = await selector.locator('option').filter({ hasText: 'Approved immutable version' }).first().getAttribute('value');
  assert(approved); await selector.selectOption(approved);
  await expect(review).toContainText('Actor ID');
  assert.equal(await trigger.count(), 0);
  await page.getByRole('button', { name: /Continue current draft/ }).click();
  await expect(page.getByLabel('Description (optional)')).toHaveValue(/13F lifecycle acceptance/);
  await page.getByRole('button', { name: 'Close editor', exact: true }).click();
  await selector.selectOption('draft');
  await page.getByRole('combobox', { name: 'Compare an approved version with this snapshot' }).selectOption(approved);
  await expect(page.getByRole('region', { name: 'Approved version comparison' })).toBeVisible();
  report.checks.push('Approved provenance, immutable viewing, continue existing draft, approved comparison');
  const axe = await readFile('.local-dev/ux-13c/tooling/node_modules/axe-core/axe.min.js', 'utf8');
  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['reflow', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.addScriptTag({ content: axe });
    const audit = await page.evaluate(async () => {
      const result = await window.axe.run('.live-studio', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] } });
      return { violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })) })), incomplete: result.incomplete.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), passes: result.passes.length };
    });
    report.audits.push({ name, ...audit });
    const layout = await page.locator('.live-studio').evaluate(element => ({ width: element.clientWidth, scrollWidth: element.scrollWidth, nodes: element.querySelectorAll('*').length }));
    report.layouts.push({ name, ...layout });
    await review.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/${name}-review.png`, fullPage: true });
    assert(layout.scrollWidth <= layout.width + 1, `${name} overflow`);
    assert.equal(audit.violations.length, 0, `${name} axe violations`);
    assert.equal(audit.incomplete.length, 0, `${name} unresolved axe checks`);
  }
  assert.deepEqual(report.errors, []);
  report.after = await fingerprint();
  assert.deepEqual(report.after, report.before);
  report.checks.push('All inventory, ledger and reservation rows retain identical fingerprints');
} finally {
  await writeFile(`${output}/browser-report.json`, JSON.stringify(report, null, 2));
  await browser.close(); await db.end();
}
console.log(JSON.stringify(report));
