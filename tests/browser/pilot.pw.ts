import { test, expect, type Page } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import pg from 'pg';

const evidence = '.local-dev/browser-acceptance/automated';
const run = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const kitName = `Browser acceptance Science ${run}`;
const materialName = `Browser material ${run}`;
const projectName = `Browser schools ${run}`;
test.describe.configure({ mode: 'default' });

test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) await capture(page, `FAILED-${info.title.replace(/[^a-z0-9]+/gi, '-')}`).catch(() => {});
});

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => console.log(`Browser error: ${error.stack}`));
  page.on('dialog', async dialog => { console.log(`Browser dialog: ${dialog.message()}`); await dialog.accept().catch(() => {}); });
});

async function login(page: Page, role = 'admin', organization = 'Kit Builder Development') {
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const account = accounts.find((a: { role: string; organization: string }) => a.role === role && a.organization === organization);
  if (!account) throw new Error('Prepare private synthetic pilot accounts before browser acceptance');
  await page.goto('/');
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').fill(account.password);
  const signedIn = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  const result = await signedIn;
  if (!result.ok()) throw new Error(`Login rejected (${result.status()}): ${(await result.json()).error}`);
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
}

async function capture(page: Page, name: string) {
  await mkdir(evidence, { recursive: true });
  await page.screenshot({ path: `${evidence}/${name}.png`, fullPage: true });
  await writeFile(`${evidence}/${name}.txt`, await page.locator('body').innerText());
}

async function tab(page: Page, id: string) {
  const routes: Record<string, [string, string]> = {
    inventory: ['Inventory', 'Items & stock'],
    product_library: ['Projects & Prastuti', 'Product Library'],
    projects_hub: ['Projects & Prastuti', 'Projects'],
  };
  const [group, item] = routes[id];
  const sidebar = page.locator('aside');
  const button = sidebar.getByRole('button', { name: new RegExp(`^${item}(?:$|\\s+\\d+)`) });
  if (!await button.isVisible()) await sidebar.getByRole('button', { name: group, exact: true }).click();
  await button.click();
  try { await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible(); }
  catch (error) { await capture(page, `failure-${id}`).catch(() => {}); throw error; }
}

// Read-only observations, plus explicitly asserted denial/replay probes. Tokens never leave the browser.
async function browserAPI(page: Page, path: string, method = 'GET', body?: unknown, key?: string) {
  return page.evaluate(async ({ path, method, body, key }) => {
    const response = await fetch(path, { method, headers: {
      Authorization: `Bearer ${localStorage.getItem('experimind_auth_token') ?? ''}`,
      'Content-Type': 'application/json', ...(key ? { 'Idempotency-Key': key } : {}),
    }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, data: await response.json() };
  }, { path, method, body, key });
}

async function fixture() { return JSON.parse(await readFile(`${evidence}/fixture.json`, 'utf8')); }

async function openProject(page: Page, name: string) {
  await tab(page, 'projects_hub');
  await page.getByRole('button').filter({ hasText: name }).click();
  await expect(page.getByRole('button', { name: 'Calculate requirements', exact: true })).toBeEnabled();
}

async function clickMutation(page: Page, locator: import('@playwright/test').Locator, suffix: string) {
  const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && ['POST', 'PUT'].includes(r.request().method()));
  await locator.click();
  const result = await response;
  const body = await result.json();
  expect(result.ok(), `Mutation ${suffix} returned ${result.status()}: ${JSON.stringify(body)}`).toBe(true);
  return body;
}

test.beforeAll(async () => {
  const url = new URL(process.env.DATABASE_URL ?? '');
  expect(url.hostname).toBe('127.0.0.1');
  expect(url.port).toBe('55432');
  expect(url.pathname).toBe('/experimind_kitbuilder_development');
  const client = new pg.Client({ connectionString: url.toString() });
  await client.connect();
  try {
    const { rows } = await client.query('SELECT name FROM organizations ORDER BY name');
    expect(rows.map(r => r.name).sort()).toEqual(['Kit Builder Development', 'Kit Builder Other Tenant']);
  } finally { await client.end(); }
});

test('A01 admin login and section navigation', async ({ page }) => {
  page.on('pageerror', error => console.log(`Browser error: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) console.log(`HTTP ${response.status()} ${new URL(response.url()).pathname}`); });
  await login(page);
  const sidebar = page.locator('aside');
  const groups = [
    ['Inventory', 'Items & stock', 'Kit assembly', 'Warehouses & bins', 'Stock transfers', 'Cycle counts'],
    ['Replenishment', 'Purchase orders', 'Suppliers'],
    ['', 'Sales orders'],
    ['Projects & Prastuti', 'Projects', 'Product Library', 'Preparation queue', 'Labels & verification'],
    ['Administration', 'Reports', 'People & roles', 'Storefront'],
  ];
  await capture(page, 'A01-overview');
  for (const [group, ...items] of groups) {
    if (group) await sidebar.getByRole('button', { name: group, exact: true }).click();
    for (const item of items) {
      console.log(`Opening ${item}`);
      const button = sidebar.getByRole('button', { name: new RegExp(`^${item.replace('&', '&')}(?:$|\\s+\\d+)`) });
      await button.click();
      await expect(button).toHaveAttribute('aria-current', 'page');
      await expect(page.locator('main')).toBeVisible();
      await capture(page, `A01-${item.replace(/[^a-z0-9]+/gi, '-')}`);
    }
  }
  await page.getByRole('button', { name: 'Operations overview', exact: true }).click();
  await expect(page.getByText('What needs attention today?', { exact: true })).toBeVisible();
});

test('A02-A05 synthetic catalog, kit and multi-school requirements', async ({ page }) => {
  test.setTimeout(300_000);
  await login(page);

  await tab(page, 'inventory');
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await page.getByRole('button', { name: 'Save Item', exact: true }).click();
  const nameInput = page.getByPlaceholder('Type new name or select standard item from curriculum / catalog...');
  await expect(nameInput).toBeVisible();
  expect(await nameInput.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(true);
  await nameInput.fill(materialName);
  await page.getByPlaceholder('e.g. Electronics, Stationary...').fill('Synthetic browser acceptance');
  await page.getByPlaceholder('e.g. Rack - Shelf 1, BIN-A1-01...').fill(`BROWSER-${run}`);
  await page.getByPlaceholder('pcs, sets, rolls').fill('pcs');
  await page.getByRole('button', { name: 'Save Item', exact: true }).click();
  await expect(nameInput).not.toBeVisible();
  await page.reload(); await tab(page, 'inventory');
  await page.getByRole('button', { name: 'Add item', exact: true }).click();
  await expect(page.getByRole('combobox', { name: /^Inventory item/ }).last().locator('option').filter({ hasText: materialName })).toHaveCount(1);
  await capture(page, 'A02-catalog-reloaded');
  console.log('A02 new synthetic material and required-field validation executed');
  await tab(page, 'product_library');
  await page.getByRole('button', { name: 'Create Kit', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  await page.getByLabel('Kit name', { exact: true }).fill(kitName);
  await page.getByLabel(/^Description/).first().fill('Synthetic browser acceptance only');
  await page.getByRole('button', { name: 'Add subject', exact: true }).click();
  await page.getByLabel('Subject 1 name', { exact: true }).fill('Science');
  for (const [index, grade] of ['Grade 8', 'Grade 9', 'Grade 10'].entries()) {
    await page.getByRole('button', { name: 'Add grade', exact: true }).click();
    await page.getByLabel(`Science grade ${index + 1} name`, { exact: true }).fill(grade);
  }
  await page.getByRole('button', { name: 'Add activity', exact: true }).first().click();
  await page.getByPlaceholder('Activity name').fill('Synthetic observation');
  await page.getByPlaceholder('Code, e.g. 8.4.1').fill('8.BROWSER');
  await page.getByLabel('Synthetic observation description', { exact: true }).fill('Persistence check');
  await page.getByPlaceholder('Search inventory to add a material').first().fill(materialName);
  await page.getByRole('button', { name: new RegExp(`^${materialName}`) }).click();
  await page.getByLabel(`${materialName} required quantity`, { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Add box', exact: true }).first().click();
  await page.getByLabel('box name', { exact: true }).fill('Browser box');
  await page.getByRole('button', { name: 'Add partition', exact: true }).click();
  await page.getByLabel('partition name', { exact: true }).fill('Browser partition');
  await page.getByRole('button', { name: 'Add pouch', exact: true }).click();
  await page.getByLabel('pouch name', { exact: true }).fill('Browser pouch');
  await page.getByLabel('Synthetic observation', { exact: true }).check();
  for (const [index, crate] of ['Common crate', 'Universal crate'].entries()) {
    await page.getByRole('button', { name: 'Add crate', exact: true }).click();
    const section = page.getByLabel('Crate name', { exact: true }).nth(index).locator('..').locator('..');
    await section.getByLabel('Crate name', { exact: true }).fill(crate);
    await section.getByRole('combobox', { name: /^Crate kind/ }).selectOption(index ? 'universal' : 'common');
    await section.getByRole('combobox', { name: /^Quantity rule/ }).selectOption(index ? 'complete_sets' : 'selected_sets');
    for (const grade of ['Grade 8', 'Grade 9', 'Grade 10']) await section.getByLabel(`Science / ${grade}`, { exact: true }).check();
  }
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await capture(page, 'A03-saved');
  await page.reload(); await tab(page, 'product_library');
  await page.getByRole('button').filter({ hasText: kitName }).click();
  await expect(page.getByLabel('Kit name', { exact: true })).toHaveValue(kitName);
  await expect(page.getByLabel('pouch name', { exact: true }).first()).toHaveValue('Browser pouch');
  await expect(page.getByPlaceholder('Activity name').first()).toHaveValue('Synthetic observation');
  await page.getByRole('button', { name: 'Approve immutable version for planning', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Approved immutable version');
  await capture(page, 'A03-approved');
  console.log('A03 packing, materials, reload and approval executed');
  await tab(page, 'projects_hub');
  await page.getByRole('button', { name: 'Create project', exact: true }).click();
  await page.getByLabel('name', { exact: true }).fill(projectName);
  for (const [index, school] of ['School A', 'School B'].entries()) {
    await page.getByRole('button', { name: 'Add school / site', exact: true }).click();
    const section = page.getByLabel('Site name', { exact: true }).nth(index).locator('..').locator('..');
    await section.getByLabel('Site name', { exact: true }).fill(school);
    await section.getByLabel('Site address', { exact: true }).fill(`Synthetic destination ${school}`);
    const versions = section.getByRole('combobox', { name: /^Add approved kit version/ });
    const versionId = await versions.locator('option').filter({ hasText: kitName }).getAttribute('value');
    await versions.selectOption(versionId!);
    for (const grade of ['Grade 8', 'Grade 9', 'Grade 10']) await section.getByLabel(`Science / ${grade} sets`, { exact: true }).fill(index ? (grade === 'Grade 8' ? '3' : '0') : '2');
    if (index) await section.getByLabel('Universal crate: explicit complete sets (enter 0 for partial selections)', { exact: true }).fill('0');
  }
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('alert').first()).toContainText(/explicit|complete/i);
  await capture(page, 'A05-missing-confirmation');
  await page.getByLabel('Universal crate: explicit complete sets (enter 0 for partial selections)', { exact: true }).first().fill('2');
  await page.getByRole('button', { name: 'Save project', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Calculate requirements', exact: true })).toBeEnabled();
  await page.reload(); await tab(page, 'projects_hub');
  await page.getByRole('button').filter({ hasText: projectName }).click();
  await expect(page.getByLabel('Site address', { exact: true }).first()).toHaveValue('Synthetic destination School A');
  await expect(page.getByLabel('Site address', { exact: true }).nth(1)).toHaveValue('Synthetic destination School B');
  const previewResponse = page.waitForResponse(r => r.url().endsWith('/preview') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Calculate requirements', exact: true }).click();
  const preview = await (await previewResponse).json();
  type PreviewLine = { site_name: string; owner_name: string; quantity: number };
  expect(preview.lines.filter((l: PreviewLine) => l.site_name === 'School A' && l.owner_name === 'Common crate').map((l: PreviewLine) => l.quantity)).toEqual([6]);
  expect(preview.lines.filter((l: PreviewLine) => l.site_name === 'School A' && l.owner_name === 'Universal crate').map((l: PreviewLine) => l.quantity)).toEqual([2]);
  expect(preview.lines.filter((l: PreviewLine) => l.site_name === 'School B' && l.owner_name === 'Common crate').map((l: PreviewLine) => l.quantity)).toEqual([3]);
  expect(preview.lines.filter((l: PreviewLine) => l.site_name === 'School B' && l.owner_name === 'Universal crate').map((l: PreviewLine) => l.quantity)).toEqual([0]);
  for (const school of ['School A', 'School B']) await page.getByText(`${school}: requirement trace`, { exact: true }).click();
  await capture(page, 'A04-A05-reloaded-requirements');
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ projectName, kitName, materialName, projectId: preview.project_id }, null, 2));
  console.log('A04-A05 persisted destinations, explicit set counts and 6/2, 3/0 crate calculations executed');
});



test('A06 synthetic stocktake, reload and duplicate posting', async ({ page }) => {
  const f = await fixture();
  await login(page);
  await tab(page, 'inventory');
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Physical stocktake and verified balances', exact: true }) });
  await panel.getByRole('button', { name: 'New stocktake', exact: true }).click();
  await panel.getByLabel('Session name', { exact: true }).fill(`Browser count ${run}`);
  await panel.getByRole('button', { name: 'Add item', exact: true }).click();
  const itemSelect = panel.getByRole('combobox', { name: /^Inventory item/ });
  const itemId = await itemSelect.locator('option').filter({ hasText: f.materialName }).getAttribute('value');
  await itemSelect.selectOption(itemId!);
  const location = `BROWSER-${f.materialName.replace(/\D/g, '')}`;
  const locations = panel.getByLabel('Physical locations (comma separated)', { exact: true });
  if (await locations.isEnabled()) await locations.fill(location);
  else await expect(locations).toHaveValue(location);
  await panel.getByLabel('All physical locations for this item are declared', { exact: true }).check();
  const createdResponse = page.waitForResponse(r => r.url().endsWith('/stocktakes') && r.request().method() === 'POST');
  await panel.getByRole('button', { name: 'Create stocktake', exact: true }).click();
  const created = await (await createdResponse).json();
  await panel.getByLabel('Counted quantity', { exact: true }).fill('100');
  await panel.getByLabel('Count unit', { exact: true }).fill('pcs');
  await panel.getByRole('button', { name: 'Save count', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Replace saved count', exact: true })).toBeEnabled();
  await panel.getByLabel('Review / reconciliation reason', { exact: true }).fill('Synthetic isolated browser count');
  await panel.getByRole('button', { name: 'Review counts', exact: true }).click();
  await panel.getByRole('button', { name: 'Approve counts', exact: true }).click();
  const approved = await browserAPI(page, `/api/v1/stocktakes/${created.id}`);
  const postedResponse = page.waitForResponse(r => r.url().endsWith(`/${created.id}/post`) && r.request().method() === 'POST');
  await panel.getByRole('button', { name: 'Post approved counts', exact: true }).click();
  expect((await postedResponse).status()).toBe(200);
  await expect(panel.getByText(/posted.*revision/)).toBeVisible();
  const before = await browserAPI(page, '/api/v1/stocktakes/ledger');
  const replay = await browserAPI(page, `/api/v1/stocktakes/${created.id}/post`, 'POST', { revision: approved.data.session.revision });
  expect([200, 409]).toContain(replay.status);
  expect((await browserAPI(page, '/api/v1/stocktakes/ledger')).data).toEqual(before.data);
  await page.reload(); await tab(page, 'inventory');
  await panel.getByRole('combobox', { name: /^Stocktake/ }).selectOption(created.id);
  await expect(panel.getByText(/posted.*revision/)).toBeVisible();
  await panel.getByText('Verified balances and legacy reconciliation', { exact: true }).click();
  await expect(panel.getByRole('row').filter({ hasText: f.materialName })).toContainText('100');
  await capture(page, 'A06-posted-reloaded');
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ ...f, itemId, location }, null, 2));
});

test('A07-A08 reservations and inspected purchasing', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Reservations and purchasing', exact: true }) });
  await panel.getByRole('combobox', { name: /^Material/ }).selectOption(f.itemId);
  await panel.getByLabel('Quantity', { exact: true }).fill('2');
  const reservation = await clickMutation(page, panel.getByRole('button', { name: 'Reserve stock', exact: true }), '/reservations');
  await expect(panel.getByText(new RegExp(`${f.materialName}.*active`)).first()).toBeVisible();
  await clickMutation(page, panel.getByRole('button', { name: 'Adjust to entered quantity', exact: true }).first(), '/adjust');
  const stale = await browserAPI(page, `/api/v1/supply-planning/reservations/${reservation.id}/adjust`, 'POST', { revision: reservation.revision, quantity: '2', reason: 'Synthetic stale browser probe' }, crypto.randomUUID());
  expect(stale.status).toBe(409);
  await page.reload(); await openProject(page, f.projectName);
  await expect(panel.getByText(new RegExp(`${f.materialName}.*active`)).first()).toBeVisible();
  await capture(page, 'A07-reservation-reloaded');
  await panel.getByRole('combobox', { name: /^Material/ }).selectOption(f.itemId);
  await panel.getByLabel('Quantity', { exact: true }).fill('4');
  await panel.getByRole('button', { name: 'Add request line', exact: true }).click();
  const request = await clickMutation(page, panel.getByRole('button', { name: 'Save draft request', exact: true }), '/requests');
  const requestUI = panel.locator('details').filter({ has: page.locator('summary').filter({ hasText: request.pr_number }) });
  await requestUI.locator('summary').click();
  await clickMutation(page, requestUI.getByRole('button', { name: 'Review', exact: true }), '/review');
  await clickMutation(page, requestUI.getByRole('button', { name: 'Approve', exact: true }), '/approve');
  await panel.getByLabel('New supplier name', { exact: true }).fill(`Browser supplier ${run}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Create supplier', exact: true }), '/suppliers');
  const order = await clickMutation(page, requestUI.getByRole('button', { name: 'Create order for selected supplier', exact: true }), '/orders');
  const orderUI = panel.locator('details').filter({ has: page.locator('summary').filter({ hasText: order.po_number }) });
  await orderUI.locator('summary').click();
  await clickMutation(page, orderUI.getByRole('button', { name: 'Review order', exact: true }), '/review');
  await clickMutation(page, orderUI.getByRole('button', { name: 'Approve order', exact: true }), '/approve');
  await orderUI.getByRole('button', { name: 'Receive delivery', exact: true }).click();
  await panel.getByRole('combobox', { name: /^Physical location/ }).selectOption(f.location);
  await panel.getByLabel('Quantity', { exact: true }).fill('2');
  const before = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`);
  const receipt = await clickMutation(page, panel.getByRole('button', { name: 'Record partial/full receipt', exact: true }), '/receipts');
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(before.data);
  await panel.getByLabel('Inspection / allocation reason', { exact: true }).fill('Synthetic accepted inspection');
  const receiptUI = panel.locator('div.rounded-xl').filter({ has: page.locator('span').filter({ hasText: new RegExp(`${order.po_number}.*pending`) }) });
  await clickMutation(page, receiptUI.getByRole('button', { name: 'accept', exact: true }), '/accept');
  const acceptedLedger = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`);
  expect(acceptedLedger.data.length).toBe(before.data.length + 1);
  const duplicate = await browserAPI(page, `/api/v1/supply-planning/receipts/${receipt.id}/accept`, 'POST', { revision: receipt.revision, reason: 'Synthetic repeated acceptance' }, crypto.randomUUID());
  expect([200, 409]).toContain(duplicate.status);
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(acceptedLedger.data);
  await panel.getByRole('button', { name: 'Record partial/full receipt', exact: true }).click();
  await panel.getByLabel('Inspection / allocation reason', { exact: true }).fill('Synthetic rejected inspection');
  await clickMutation(page, receiptUI.getByRole('button', { name: 'reject', exact: true }), '/reject');
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(acceptedLedger.data);
  await page.reload(); await openProject(page, f.projectName);
  await expect(panel.getByText(new RegExp(`${order.po_number}.*accepted`))).toBeVisible();
  await expect(panel.getByText(new RegExp(`${order.po_number}.*rejected`))).toBeVisible();
  await capture(page, 'A08-inspected-receipts-reloaded');
});

test('A10-A11 school packing, QC, label PDF and package lookup', async ({ page, context }) => {
  test.setTimeout(240_000);
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Assembly, packing and QC', exact: true }) });
  const schoolSelect = panel.getByRole('combobox', { name: 'Packing school', exact: true });
  const orders = [];
  for (const school of ['School A', 'School B']) {
    await schoolSelect.selectOption({ label: school });
    await panel.getByLabel('Packing batch code', { exact: true }).fill(`Browser ${school} ${run}`);
    const order = await clickMutation(page, panel.getByRole('button', { name: 'Generate packing order', exact: true }), '/orders');
    orders.push(order);
    await panel.getByLabel('Packing team', { exact: true }).fill('Synthetic browser team');
    await clickMutation(page, panel.getByRole('button', { name: 'Assign', exact: true }), '/assign');
    await clickMutation(page, panel.getByRole('button', { name: 'Release for packing', exact: true }), '/release');
    await expect(panel.getByRole('button', { name: 'Accept selected QC', exact: true })).toBeDisabled();
    await panel.getByLabel('Pick material', { exact: true }).selectOption(f.itemId);
    await panel.getByLabel('Pick quantity', { exact: true }).fill(school === 'School A' ? '2' : '3');
    await panel.getByLabel('Pick location', { exact: true }).fill(f.location);
    await clickMutation(page, panel.getByRole('button', { name: 'Pick stock', exact: true }), '/picks');
    await panel.getByRole('button', { name: 'Select all packages', exact: true }).click();
    await panel.getByLabel('Packing notes and correction', { exact: true }).fill('Synthetic complete packing inspection');
    await clickMutation(page, panel.getByRole('button', { name: 'Complete selected checklists', exact: true }), '/checklist');
    const qc = panel.getByRole('group', { name: 'Packing QC inspection', exact: true });
    for (const check of ['material', 'quantity', 'placement', 'packaging', 'stickers', 'instructions']) await qc.getByLabel(check, { exact: true }).check();
    if (school === 'School A') {
      await clickMutation(page, panel.getByRole('button', { name: 'Reject selected QC', exact: true }), '/qc');
      await expect(panel.getByText(/QC rejected/).first()).toBeVisible();
      await capture(page, 'A10-rejected-QC');
      await clickMutation(page, panel.getByRole('button', { name: 'Return selected to rework', exact: true }), '/checklist');
      await panel.getByLabel('Packing notes and correction', { exact: true }).fill('Replaced damaged seal and rechecked all contents');
      await clickMutation(page, panel.getByRole('button', { name: 'Complete selected checklists', exact: true }), '/checklist');
    }
    await clickMutation(page, panel.getByRole('button', { name: 'Accept selected QC', exact: true }), '/qc');
    await expect(panel.getByText('Ready for Delivery', { exact: true }).first()).toBeVisible();
    await capture(page, `A10-${school.replace(' ', '-')}-ready`);
    const labels = panel.getByRole('group', { name: 'Physical package labels', exact: true });
    const before = await browserAPI(page, `/api/v1/packing/orders/${order.id}`);
    const ledger = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`);
    for (const copy of ['preview', 'reprint']) {
      await labels.getByRole('button', { name: 'Preview / reprint selected labels', exact: true }).click();
      await expect(labels.getByTitle('Packing label preview')).toBeVisible();
      const download = page.waitForEvent('download');
      await labels.getByRole('link', { name: 'Download labels', exact: true }).click();
      await (await download).saveAs(`${evidence}/A11-${school.replace(' ', '-')}-${copy}.pdf`);
    }
    expect((await browserAPI(page, `/api/v1/packing/orders/${order.id}`)).data).toEqual(before.data);
    expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(ledger.data);
    await capture(page, `A11-${school.replace(' ', '-')}-PDF`);
  }
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ ...f, packing: orders }, null, 2));
  await page.reload(); await openProject(page, f.projectName);
  await panel.getByRole('button').filter({ hasText: orders[0].batch_code }).click();
  await expect(panel.getByText('Ready for Delivery', { exact: true }).first()).toBeVisible();
  const packageId = orders[0].snapshot.packages[0].id;
  const lookup = await context.newPage();
  await lookup.goto(`/?packing_package=${packageId}`);
  await expect(lookup.getByRole('heading', { name: 'Physical package lookup', exact: true })).toBeVisible();
  await expect(lookup.getByText(new RegExp(`${f.projectName} / School A`))).toBeVisible();
  await capture(lookup, 'A11-authenticated-lookup'); await lookup.close();
  const anonymous = await context.browser()!.newContext(); const signedOut = await anonymous.newPage();
  await signedOut.goto(`http://127.0.0.1:3100/?packing_package=${packageId}`);
  await expect(signedOut.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect((await signedOut.request.get(`http://127.0.0.1:3100/api/v1/packing/packages/${packageId}`)).status()).toBe(401);
  await capture(signedOut, 'A11-signed-out-lookup'); await anonymous.close();
});

test('A09 synthetic recipe, input issue and inspected production', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await fixture(); await login(page);
  await tab(page, 'inventory');
  const outputName = `Browser output ${run}`;
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await page.getByPlaceholder('Type new name or select standard item from curriculum / catalog...').fill(outputName);
  await page.getByPlaceholder('e.g. Electronics, Stationary...').fill('Synthetic production');
  await page.getByPlaceholder('e.g. Rack - Shelf 1, BIN-A1-01...').fill(f.location);
  await page.getByPlaceholder('pcs, sets, rolls').fill('pcs');
  const savedOutput = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/inventory');
  await page.getByRole('button', { name: 'Save Item', exact: true }).click();
  expect((await savedOutput).ok()).toBe(true);
  await page.reload(); await tab(page, 'inventory');
  const stock = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Physical stocktake and verified balances', exact: true }) });
  await stock.getByRole('button', { name: 'Reload', exact: true }).click();
  await stock.getByRole('button', { name: 'New stocktake', exact: true }).click();
  await stock.getByLabel('Session name', { exact: true }).fill(`Browser zero output ${run}`);
  await stock.getByRole('button', { name: 'Add item', exact: true }).click();
  const outputId = await stock.getByRole('combobox', { name: /^Inventory item/ }).locator('option').filter({ hasText: outputName }).getAttribute('value');
  await stock.getByRole('combobox', { name: /^Inventory item/ }).selectOption(outputId!);
  await stock.getByLabel('Physical locations (comma separated)', { exact: true }).fill(f.location);
  await stock.getByLabel('All physical locations for this item are declared', { exact: true }).check();
  await clickMutation(page, stock.getByRole('button', { name: 'Create stocktake', exact: true }), '/stocktakes');
  await stock.getByLabel('Counted quantity', { exact: true }).fill('0');
  await stock.getByLabel('Count unit', { exact: true }).fill('pcs');
  await clickMutation(page, stock.getByRole('button', { name: 'Save count', exact: true }), '/count');
  await stock.getByLabel('Review / reconciliation reason', { exact: true }).fill('Synthetic zero output verified before production');
  await clickMutation(page, stock.getByRole('button', { name: 'Review counts', exact: true }), '/review');
  await clickMutation(page, stock.getByRole('button', { name: 'Approve counts', exact: true }), '/approve');
  await clickMutation(page, stock.getByRole('button', { name: 'Post approved counts', exact: true }), '/post');
  // This recipe makes general stock; it is not part of the school's approved demand.
  await page.locator('aside').getByRole('button', { name: 'Projects & Prastuti', exact: true }).click();
  await page.locator('aside').getByRole('button', { name: 'Preparation queue', exact: true }).click();
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Production and in-house preparation', exact: true }) });
  await panel.getByText('Manufacturing recipes', { exact: true }).click();
  await panel.getByLabel('Name', { exact: true }).fill(`Browser recipe ${run}`);
  await panel.getByRole('combobox', { name: /^Finished item/ }).selectOption(outputId!);
  await panel.getByLabel('Expected yield', { exact: true }).fill('1');
  await panel.getByRole('combobox', { name: /^Input material/ }).selectOption(f.itemId);
  await panel.getByLabel('Input quantity', { exact: true }).fill('1');
  await panel.getByRole('button', { name: 'Add input', exact: true }).click();
  const recipe = await clickMutation(page, panel.getByRole('button', { name: 'Save draft recipe', exact: true }), '/recipes');
  const recipeUI = panel.locator('div.flex').filter({ has: page.locator('span').filter({ hasText: `Browser recipe ${run}` }) });
  await clickMutation(page, recipeUI.getByRole('button', { name: 'Approve recipe', exact: true }), '/approve');
  await panel.getByRole('combobox', { name: /^Approved recipe/ }).selectOption(recipe.id);
  await panel.getByLabel('Planned quantity', { exact: true }).fill('4');
  const order = await clickMutation(page, panel.getByRole('button', { name: 'Create draft work order', exact: true }), '/orders');
  await panel.getByLabel('Reason / QC notes', { exact: true }).fill('Synthetic production inspection');
  await clickMutation(page, panel.getByRole('button', { name: 'Release', exact: true }), '/release');
  await clickMutation(page, panel.getByRole('button', { name: 'Reserve inputs', exact: true }), '/reserve');
  await clickMutation(page, panel.getByRole('button', { name: 'Start', exact: true }), '/start');
  await panel.getByRole('combobox', { name: /^Input allocation/ }).selectOption({ index: 1 });
  await panel.getByLabel('Operation quantity', { exact: true }).fill('4');
  await panel.getByLabel('Location', { exact: true }).fill(f.location);
  await clickMutation(page, panel.getByRole('button', { name: 'Issue inputs', exact: true }), '/issues');
  const before = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${outputId}`);
  await panel.getByLabel('Batch identity', { exact: true }).fill(`Browser batch ${run}`);
  const batch = await clickMutation(page, panel.getByRole('button', { name: 'Record output awaiting QC', exact: true }), '/output');
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${outputId}`)).data).toEqual(before.data);
  await panel.getByRole('combobox', { name: /^QC batch/ }).selectOption(batch.id);
  await panel.getByLabel('Operation quantity', { exact: true }).fill('1');
  await clickMutation(page, panel.getByRole('button', { name: 'reject', exact: true }), '/qc');
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${outputId}`)).data).toEqual(before.data);
  await panel.getByRole('combobox', { name: /^QC batch/ }).selectOption(batch.id);
  await panel.getByLabel('Operation quantity', { exact: true }).fill('3');
  await clickMutation(page, panel.getByRole('button', { name: 'accept', exact: true }), '/qc');
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${outputId}`)).data.length).toBe(before.data.length + 1);
  await clickMutation(page, panel.getByRole('button', { name: 'Complete inspected production', exact: true }), '/complete');
  await page.reload();
  await page.locator('aside').getByRole('button', { name: 'Projects & Prastuti', exact: true }).click();
  await page.locator('aside').getByRole('button', { name: 'Preparation queue', exact: true }).click();
  await panel.getByRole('button').filter({ hasText: outputName }).click();
  await expect(panel.getByText(/produced 4.*accepted 3.*rejected 1/)).toBeVisible();
  await capture(page, 'A09-production-reloaded');
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ ...await fixture(), productionId: order.id, outputId }, null, 2));
});




test('A12 split dispatch, partial receipt, return and correction', async ({ page }) => {
  test.setTimeout(240_000);
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Delivery, installation and project completion', exact: true }) });
  await panel.getByLabel('Recipient', { exact: true }).fill('Synthetic school representative');
  await panel.getByLabel('Delivery or installation notes', { exact: true }).fill('Synthetic delivery acceptance');
  const ledger = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`);
  const existing = (await browserAPI(page, `/api/v1/delivery?project_id=${f.projectId}`)).data;
  const claimed = new Set(existing.flatMap((o: { manifest: { id: string }[] }) => o.manifest.map(p => p.id)));
  const deliveries = existing.map((o: { id: string }) => o.id);
  for (const allocation of f.packing) {
    const batchIds = new Set(allocation.snapshot.packages.filter((p: { kind: string }) => p.kind === 'batch').map((p: { id: string }) => p.id));
    const roots = allocation.snapshot.packages.filter((p: { id: string; parent_id: string }) => batchIds.has(p.parent_id) && !claimed.has(p.id));
    const groups = allocation.snapshot.site_name === 'School A' && !existing.length ? [roots.filter((_: unknown, i: number) => i % 2 === 0), roots.filter((_: unknown, i: number) => i % 2 !== 0)] : [roots];
    for (const group of groups) {
      if (!group.length) continue;
      const form = panel.locator('details').filter({ has: page.getByText('Create school dispatch plan', { exact: true }) });
      if (!await form.getAttribute('open').then(v => v !== null)) await form.locator('summary').click();
      await form.getByLabel('QC approved allocation', { exact: true }).selectOption(allocation.id);
      for (const root of group) await form.getByLabel(new RegExp(root.code)).check();
      await form.getByLabel('Transport carrier', { exact: true }).fill('Synthetic carrier');
      const order = await clickMutation(page, form.getByRole('button', { name: 'Create dispatch plan', exact: true }), '/orders');
      deliveries.push(order.id);
      await clickMutation(page, panel.getByRole('button', { name: 'dispatch', exact: true }), '/dispatch');
      await clickMutation(page, panel.getByRole('button', { name: 'transit', exact: true }), '/transit');
      const pending = panel.getByRole('checkbox', { name: / · Pending$/ });
      if (deliveries.length === 1) {
        await pending.first().check();
        await clickMutation(page, panel.getByRole('button', { name: 'Confirm selected receipts', exact: true }), '/receive');
        await panel.getByRole('checkbox', { name: / · Pending$/ }).first().check();
        await clickMutation(page, panel.getByRole('button', { name: 'Report selected package issue', exact: true }), '/issues');
        await clickMutation(page, panel.getByRole('button', { name: 'fail', exact: true }), '/fail');
        await clickMutation(page, panel.getByRole('button', { name: 'return', exact: true }), '/return');
        await clickMutation(page, panel.getByRole('button', { name: 'Record correction', exact: true }), '/issues');
        await clickMutation(page, panel.getByRole('button', { name: 'retry', exact: true }), '/retry');
      }
      await panel.getByRole('button', { name: 'Select remaining packages', exact: true }).click();
      await clickMutation(page, panel.getByRole('button', { name: 'Confirm selected receipts', exact: true }), '/receive');
      const before = await browserAPI(page, `/api/v1/delivery/orders/${order.id}`);
      expect(before.data.order.status).toBe('delivered');
      expect(before.data.order.manifest).toEqual(order.manifest);
      await panel.getByRole('button', { name: 'Preview delivery note', exact: true }).click();
      await expect(panel.getByTitle('Delivery note preview')).toBeVisible();
      expect((await browserAPI(page, `/api/v1/delivery/orders/${order.id}`)).data).toEqual(before.data);
    }
  }
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(ledger.data);
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ ...f, deliveries }, null, 2));
  await capture(page, 'A12-delivered');
});

test('A13-A14 installation issues, acceptance and project closure history', async ({ page }) => {
  test.setTimeout(180_000);
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Delivery, installation and project completion', exact: true }) });
  await panel.getByLabel('Recipient', { exact: true }).fill('Synthetic customer');
  await panel.getByLabel('Delivery or installation notes', { exact: true }).fill('Synthetic installation inspection');
  await panel.getByText('Installation plan settings', { exact: true }).click();
  await panel.getByLabel('Installation checklist configuration', { exact: true }).fill('Verify synthetic kit setup');
  await panel.getByLabel('Site survey', { exact: true }).fill('Synthetic room survey');
  const school = panel.locator('div').filter({ has: page.getByRole('heading', { name: /^School A ·/ }) }).filter({ has: page.getByRole('button', { name: 'Plan installation', exact: true }) }).last();
  const progress = await browserAPI(page, `/api/v1/delivery/projects/${f.projectId}`);
  const job = progress.data.schools.find((s: { name: string }) => s.name === 'School A').installation ?? await clickMutation(page, school.getByRole('button', { name: 'Plan installation', exact: true }), '/installations');
  if (job.status === 'completed' || job.status === 'installed') await clickMutation(page, panel.getByRole('button', { name: 'Reopen / revisit', exact: true }), `/installations/${job.id}`);
  await expect(panel.getByRole('button', { name: 'Record customer acceptance and close', exact: true })).toBeDisabled();
  await clickMutation(page, panel.getByRole('button', { name: 'Save notes / survey', exact: true }), `/installations/${job.id}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Report installation issue', exact: true }), `/installations/${job.id}`);
  if (!await panel.getByLabel('Verify synthetic kit setup · Required', { exact: true }).isChecked()) await clickMutation(page, panel.getByLabel('Verify synthetic kit setup · Required', { exact: true }), `/installations/${job.id}`);
  const blocked = page.waitForResponse(r => r.url().endsWith(`/installations/${job.id}`) && r.request().method() === 'POST');
  await panel.getByRole('button', { name: 'Submit installer completion', exact: true }).click();
  expect((await blocked).status()).toBe(409);
  await clickMutation(page, panel.getByRole('button', { name: 'Record installation correction', exact: true }), `/installations/${job.id}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Submit installer completion', exact: true }), `/installations/${job.id}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Accept installation', exact: true }), `/installations/${job.id}`);
  await expect(panel.getByLabel('Verify synthetic kit setup · Required', { exact: true })).toBeDisabled();
  await capture(page, 'A13-installation-accepted');
  const supply = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Reservations and purchasing', exact: true }) });
  while (await supply.getByRole('button', { name: 'release', exact: true }).count()) {
    const count = await supply.getByRole('button', { name: 'release', exact: true }).count();
    await clickMutation(page, supply.getByRole('button', { name: 'release', exact: true }).first(), '/release');
    await expect(supply.getByRole('button', { name: 'release', exact: true })).toHaveCount(count - 1);
  }
  await panel.getByRole('button', { name: 'Refresh progress', exact: true }).click();
  await clickMutation(page, panel.getByRole('button', { name: 'Record customer acceptance and close', exact: true }), '/completion');
  await capture(page, 'A14-project-closed');
  await panel.getByLabel('Delivery or installation notes', { exact: true }).fill('Synthetic authorized revisit');
  await clickMutation(page, panel.getByRole('button', { name: 'Reopen project', exact: true }), '/completion');
  await clickMutation(page, panel.getByRole('button', { name: 'Reopen / revisit', exact: true }), `/installations/${job.id}`);
  await expect(panel.getByRole('button', { name: 'Record customer acceptance and close', exact: true })).toBeDisabled();
  await clickMutation(page, panel.getByRole('button', { name: 'Submit installer completion', exact: true }), `/installations/${job.id}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Accept installation', exact: true }), `/installations/${job.id}`);
  await clickMutation(page, panel.getByRole('button', { name: 'Record customer acceptance and close', exact: true }), '/completion');
  await page.reload(); await openProject(page, f.projectName);
  await expect(panel.getByRole('button', { name: 'Reopen project', exact: true })).toBeVisible();
  await writeFile(`${evidence}/fixture.json`, JSON.stringify({ ...f, installationId: job.id }, null, 2));
  await capture(page, 'A14-closure-reloaded');
});


test('Private attachment browser uploads, downloads and denials', async ({ page }) => {
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const reopen = page.getByRole('button', { name: 'Reopen project', exact: true });
  await expect(page.getByText(/^Project (active|closed) ·/)).toBeVisible();
  if (await reopen.isVisible()) {
    await page.getByLabel('Delivery or installation notes', { exact: true }).fill('Synthetic private attachment acceptance');
    await clickMutation(page, reopen, '/completion');
  }
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Private project files', exact: true }) });
  const progress = (await browserAPI(page, `/api/v1/delivery/projects/${f.projectId}`)).data;
  const school = progress.schools.find((s: {name: string}) => s.name === 'School A');
  const deliveries = await Promise.all(f.deliveries.map(async (id: string) => (await browserAPI(page, `/api/v1/delivery/orders/${id}`)).data.order));
  const delivery = deliveries.find(order => order.site_id === school.site_id);
  for (const kind of ['project', 'survey', 'installation', 'delivery']) {
    await panel.getByLabel('Attachment record type').selectOption(kind);
    if (kind !== 'project') await panel.getByLabel('Attachment school').selectOption(school.site_id);
    if (kind === 'installation' || kind === 'delivery') await panel.getByLabel('Related installation or delivery ID').fill(kind === 'installation' ? f.installationId : delivery.id);
    const name = `Browser-${kind}-${run}.txt`, bytes = Buffer.from(`Synthetic ${kind} attachment`);
    await panel.getByLabel('Private file', { exact: true }).setInputFiles({ name, mimeType: 'text/plain', buffer: bytes });
    await clickMutation(page, panel.getByRole('button', { name: 'Upload private file', exact: true }), `/projects/${f.projectId}`);
    const row = panel.locator('div').filter({ has: page.getByText(`${name} · ${kind} · ${bytes.length} bytes`, { exact: true }) }).last();
    const download = page.waitForEvent('download'); await row.getByRole('button', { name: 'Authenticated download' }).click();
    const saved = await download; expect(saved.suggestedFilename()).toBe(name);
    const stream = await saved.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
    expect(Buffer.concat(chunks)).toEqual(bytes);
  }
  for (const file of [{ name: 'forbidden.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('synthetic') }, { name: 'oversize.txt', mimeType: 'text/plain', buffer: Buffer.alloc(10 * 1024 * 1024 + 1, 65) }]) {
    await panel.getByLabel('Attachment record type').selectOption('project');
    await panel.getByLabel('Private file', { exact: true }).setInputFiles(file);
    const response = page.waitForResponse(r => r.request().method() === 'POST' && r.url().endsWith(`/attachments/projects/${f.projectId}`));
    await panel.getByRole('button', { name: 'Upload private file', exact: true }).click();
    expect((await response).ok()).toBe(false); await expect(panel.getByRole('alert')).toBeVisible();
  }
  await page.reload(); await openProject(page, f.projectName); await expect(panel.getByText(`Browser-project-${run}.txt`, { exact: false })).toBeVisible();
  const files = (await browserAPI(page, `/api/v1/attachments/projects/${f.projectId}`)).data;
  await page.getByLabel('Delivery or installation notes', { exact: true }).fill('Synthetic attachment checks completed');
  await page.getByLabel('Recipient', { exact: true }).fill('Synthetic customer');
  await clickMutation(page, page.getByRole('button', { name: 'Record customer acceptance and close', exact: true }), '/completion');
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await login(page, 'admin', 'Kit Builder Other Tenant');
  expect([403, 404]).toContain((await browserAPI(page, `/api/v1/attachments/${files[0].id}/download`)).status);
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await login(page, 'viewer'); await openProject(page, f.projectName); await expect(panel.getByRole('button', { name: 'Upload private file', exact: true })).toHaveCount(0);
  await capture(page, 'private-attachments-viewer');
});

test('Shared label layout persists in a second browser profile', async ({ page, browser }) => {
  const f = await fixture(); await login(page); await openProject(page, f.projectName);
  const panel = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Assembly, packing and QC', exact: true }) });
  await panel.getByRole('button').filter({ hasText: f.packing[0].batch_code }).click();
  const labels = page.getByRole('group', { name: 'Physical package labels' });
  await expect(labels.getByRole('button', { name: 'Save organization layout', exact: true })).toBeEnabled();
  const before = await browserAPI(page, `/api/v1/packing/orders/${f.packing[0].id}`);
  const ledger = await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`);
  await labels.getByLabel('width mm', { exact: true }).fill('103');
  await clickMutation(page, labels.getByRole('button', { name: 'Save organization layout', exact: true }), '/packing-label-layouts');
  const context = await browser.newContext();
  try {
    const second = await context.newPage(); await login(second); await openProject(second, f.projectName);
    const other = second.locator('section').filter({ has: second.getByRole('heading', { name: 'Assembly, packing and QC', exact: true }) });
    await other.getByRole('button').filter({ hasText: f.packing[0].batch_code }).click();
    await expect(second.getByRole('group', { name: 'Physical package labels' }).getByLabel('width mm', { exact: true })).toHaveValue('103');
    await other.getByRole('button', { name: 'Select all packages', exact: true }).click();
    await second.getByRole('button', { name: 'Preview / reprint selected labels', exact: true }).click();
    await expect(second.getByTitle('Packing label preview', { exact: true })).toBeVisible();
    await capture(second, 'shared-layout-second-profile');
  } finally { await context.close(); }
  expect((await browserAPI(page, `/api/v1/packing/orders/${f.packing[0].id}`)).data).toEqual(before.data);
  expect((await browserAPI(page, `/api/v1/stocktakes/ledger?item=${f.itemId}`)).data).toEqual(ledger.data);
});


test('A15 role and tenant denials; A16 sign-out recovery', async ({ page }) => {
  const f = await fixture();
  await login(page, 'viewer');
  expect((await browserAPI(page, '/api/v1/delivery/orders', 'POST', {}, `viewer-${run}`)).status).toBe(403);
  await capture(page, 'A15-viewer');
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await login(page, 'staff');
  const current = (await browserAPI(page, `/api/v1/delivery/orders/${f.deliveries[0]}`)).data.order;
  expect((await browserAPI(page, `/api/v1/delivery/orders/${current.id}/dispatch`, 'POST', { revision: current.revision, reason: 'Denied synthetic approval' }, crypto.randomUUID())).status).toBe(403);
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await login(page, 'admin', 'Kit Builder Other Tenant');
  for (const path of [`/api/v1/packing/orders/${f.packing[0].id}`, `/api/v1/delivery/orders/${f.deliveries[0]}`, `/api/v1/delivery/projects/${f.projectId}`]) {
    expect([403, 404]).toContain((await browserAPI(page, path)).status);
  }
  await capture(page, 'A15-other-tenant');
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await login(page); await openProject(page, f.projectName);
  const before = await browserAPI(page, `/api/v1/delivery?project_id=${f.projectId}`);
  await page.getByLabel('Delivery or installation notes', { exact: true }).fill('Unsaved synthetic recovery note');
  await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect((await browserAPI(page, `/api/v1/delivery?project_id=${f.projectId}`)).status).toBe(401);
  await login(page); await openProject(page, f.projectName);
  expect((await browserAPI(page, `/api/v1/delivery?project_id=${f.projectId}`)).data).toEqual(before.data);
  await capture(page, 'A16-session-recovered');
});

test('A02-A03 catalog edits preserve approved versions and other masters', async ({ page }) => {
  const f = await fixture();
  await login(page);
  const approved = await browserAPI(page, '/api/v1/product-templates/approved');
  const masters = await browserAPI(page, '/api/v1/product-templates');
  expect(approved.status).toBe(200); expect(masters.status).toBe(200);
  await tab(page, 'inventory');
  await page.getByPlaceholder('Search items by name, SKU, category, or bin location...').fill(f.materialName);
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.getByTitle('Edit Item Details', { exact: true }).first().click();
  await page.locator('input[list="edit-category-options"]').fill('Synthetic browser edited');
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Edit Component Properties', exact: true })).not.toBeVisible();
  await page.reload(); await tab(page, 'inventory');
  await page.getByPlaceholder('Search items by name, SKU, category, or bin location...').fill(f.materialName);
  await page.getByRole('button', { name: 'Cards', exact: true }).click();
  await page.getByTitle('Edit Item Details', { exact: true }).first().click();
  await expect(page.locator('input[list="edit-category-options"]')).toHaveValue('Synthetic browser edited');
  await capture(page, 'A02-edited-reloaded');
  await page.reload(); await tab(page, 'product_library');
  await page.getByRole('button').filter({ hasText: f.kitName }).click();
  await page.getByLabel(/^Description/).first().fill('Synthetic browser isolation verified');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Draft saved');
  await page.reload(); await tab(page, 'product_library');
  await page.getByRole('button').filter({ hasText: f.kitName }).click();
  await expect(page.getByLabel(/^Description/).first()).toHaveValue('Synthetic browser isolation verified');
  expect((await browserAPI(page, '/api/v1/product-templates/approved')).data).toEqual(approved.data);
  const after = await browserAPI(page, '/api/v1/product-templates');
  const others = (rows: Array<{ name: string }>) => rows.filter(row => row.name !== f.kitName);
  expect(others(after.data)).toEqual(others(masters.data));
  await capture(page, 'A03-approved-isolation');
});
