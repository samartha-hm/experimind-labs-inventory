import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const evidence = '.local-dev/d5-browser';
const previous = '4c6e3a5f-db11-4c79-9fd2-a892f640997e';
const run = Date.now();
const browserMutations: { path: string; key: string; input: unknown; result: unknown }[] = [];

async function login(page: Page) {
  const target = new URL(process.env.DATABASE_URL!);
  expect(target.hostname).toBe('127.0.0.1');
  expect(target.port).toBe('55432');
  expect(target.pathname).toBe('/experimind_kitbuilder_test');
  expect(process.env.DATABASE_SCHEMA).toMatch(/^requirement_test_[a-f0-9]{32}$/);
  const account = JSON.parse(await readFile(process.env.D5_BROWSER_ACCOUNT ?? '.local-dev/d50-browser-account.json', 'utf8'));
  await page.goto('/');
  await page.getByRole('textbox', { name: /email/i }).fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  const response = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  const signedIn = await response;
  expect(signedIn.status()).toBe(200);
  const { token } = await signedIn.json();
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  return { token: token as string, actor: account.id as string };
}

async function api(request: APIRequestContext, token: string, path: string, method = 'GET', data?: unknown) {
  const response = await request.fetch(`/api/v1/${path}`, {
    method, headers: { Authorization: `Bearer ${token}` }, data,
  });
  const body = await response.json();
  expect(response.ok(), `${method} ${path}: ${response.status()} ${JSON.stringify(body)}`).toBe(true);
  return body;
}

async function inventory(page: Page) {
  const aside = page.locator('aside');
  const stock = aside.getByRole('button', { name: /^Items & stock/ });
  if (!await stock.isVisible()) await aside.getByRole('button', { name: 'Inventory', exact: true }).click();
  await stock.click();
  return page.locator('section').filter({ has: page.getByRole('heading', { name: 'Physical stocktake and verified balances' }) });
}

async function mutate(page: Page, button: import('@playwright/test').Locator, suffix: string) {
  const waiting = page.waitForResponse(r => new URL(r.url()).pathname.endsWith(suffix) && ['POST', 'PUT'].includes(r.request().method()));
  await button.click();
  const response = await waiting;
  const body = await response.json();
  expect(response.ok(), `${suffix}: ${response.status()} ${JSON.stringify(body)}`).toBe(true);
  const sent = response.request();
  browserMutations.push({ path: new URL(sent.url()).pathname.split('/').at(-1)!,
    key: sent.headers()['idempotency-key'], input: sent.postDataJSON(), result: body });
  return body;
}

test('D5 stocktake explicit confirmation, cancellation, tab recovery and immutable posting', async ({ page, request, context }) => {
  let { token, actor } = await login(page);
  const old = await api(request, token, `stocktakes/${previous}`);
  const oldLedger = (await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.stocktake_id === previous);
  expect(old.session.status).toBe('approved'); expect(old.session.revision).toBe(4); expect(oldLedger).toEqual([]);
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/previous.json`, JSON.stringify({ session: old.session, ledger: oldLedger }, null, 2));

  let panel = await inventory(page);
  // Catalog and all stocktake transitions are exercised through real app controls.
  const name = `SIMULATED D5 material ${run}`;
  await page.getByRole('button', { name: 'Add Item', exact: true }).click();
  await page.getByPlaceholder('Type new name or select standard item from curriculum / catalog...').fill(name);
  await page.getByPlaceholder('e.g. Electronics, Stationary...').fill('SIMULATED software acceptance');
  await page.getByPlaceholder('e.g. Rack - Shelf 1, BIN-A1-01...').fill(`D5-${run}`);
  await page.getByPlaceholder('pcs, sets, rolls').fill('pcs');
  await page.getByRole('button', { name: 'Save Item', exact: true }).click();
  await expect(page.getByPlaceholder('Type new name or select standard item from curriculum / catalog...')).toBeHidden();
  await panel.getByRole('button', { name: 'Reload', exact: true }).click();
  await panel.getByRole('button', { name: 'New stocktake', exact: true }).click();
  await panel.getByLabel('Session name', { exact: true }).fill(`SIMULATED D5 count ${run}`);
  await panel.getByRole('button', { name: 'Add item', exact: true }).click();
  await panel.getByRole('combobox', { name: /^Inventory item/ }).selectOption({ label: `${name} · pcs` });
  await panel.getByLabel('Physical locations (comma separated)', { exact: true }).fill(`D5-${run}`);
  await panel.getByLabel('All physical locations for this item are declared').check();
  const created = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/v1/stocktakes');
  await panel.getByRole('button', { name: 'Create stocktake', exact: true }).click();
  const source = await (await created).json();
  const item = source.targets[0].item_id;
  await panel.getByLabel('Counted quantity', { exact: true }).fill('12');
  await panel.getByRole('button', { name: 'Save count', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Replace saved count', exact: true })).toBeEnabled();
  await panel.getByLabel('Review / reconciliation reason', { exact: true }).fill('SIMULATED isolated acceptance, no real stock');
  await panel.getByRole('button', { name: 'Review counts', exact: true }).click();
  await panel.getByRole('button', { name: 'Approve counts', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Post approved counts', exact: true })).toBeEnabled();
  const approved = await api(request, token, `stocktakes/${source.id}`);
  expect(approved.session.status).toBe('approved');
  let postRequests = 0;
  page.on('request', r => { if (r.url().endsWith(`/${source.id}/post`)) postRequests++; });
  page.on('dialog', async dialog => { await dialog.dismiss(); throw new Error('Stocktake must not raise a native dialog'); });
  const open = panel.getByRole('button', { name: 'Post approved counts', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Confirm stocktake posting' });
  await open.click();
  await expect(dialog).toContainText(source.id);
  await expect(dialog).toContainText(/12(?:\.0+)? pcs/);
  await expect(dialog).toContainText('irreversibly');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(dialog.getByRole('button', { name: 'Confirm and post counts' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(open).toBeFocused();
  await open.click(); await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(open).toBeFocused(); expect(postRequests).toBe(0);
  expect((await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.stocktake_id === source.id)).toEqual([]);
  for (const viewport of [{ width: 390, height: 844 }, { width: 1024, height: 768 }, { width: 1440, height: 1000 }]) {
    await page.setViewportSize(viewport); await open.click();
    const bounds = await dialog.boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    await page.keyboard.press('Escape');
  }
  await open.click(); await page.close(); // interrupted tab must not post
  page = await context.newPage();
  const refreshed = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/refresh-token') && r.status() === 200);
  await page.goto('/');
  const staleToken = token;
  token = (await (await refreshed).json()).token;
  await expect(page.getByRole('button', { name: 'Sign Out', exact: true })).toBeVisible();
  panel = await inventory(page);
  await panel.getByRole('combobox', { name: /^Stocktake/ }).selectOption(source.id);
  await panel.getByRole('button', { name: 'Post approved counts', exact: true }).click();
  const postedResponse = page.waitForResponse(r => r.url().endsWith(`/${source.id}/post`));
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm and post counts' }).click();
  expect((await postedResponse).status()).toBe(200);
  await expect(panel.getByRole('button', { name: 'Post approved counts', exact: true })).toBeHidden();
  await expect(panel).toBeFocused();
  const ledger = (await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.stocktake_id === source.id);
  expect(ledger).toHaveLength(1); expect(ledger[0].actor_id).toBe(actor);
  expect(Number(ledger[0].qty_delta)).toBe(12); expect(Number(ledger[0].running_balance)).toBe(12);
  expect(ledger[0].reference_id).toBe(source.id); expect(ledger[0].verification_entry_id).toBeTruthy();
  const staleRetry = await request.post(`/api/v1/stocktakes/${source.id}/post`, {
    headers: { Authorization: `Bearer ${staleToken}` }, data: { revision: approved.session.revision },
  });
  expect(staleRetry.status()).toBe(403);
  await api(request, token, `stocktakes/${source.id}/post`, 'POST', { revision: approved.session.revision });
  expect((await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.stocktake_id === source.id)).toEqual(ledger);
  const history = await api(request, token, `stocktakes/${source.id}/history`);
  expect(history[0].snapshot.status).toBe('posted'); expect(history[0].actor_id).toBe(actor);
  await writeFile(`${evidence}/stocktake.json`, JSON.stringify({ source: source.id, item, ledger, history }, null, 2));
});

test('D5 fresh approved school demand and trusted procurement browser journey', async ({ page, request }) => {
  test.setTimeout(240_000);
  let { token } = await login(page);
  const stock = JSON.parse(await readFile(`${evidence}/stocktake.json`, 'utf8'));
  const item = stock.ledger[0].item_id;
  const before = (await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.item_id === item).reduce((n: number, e: any) => n + Number(e.qty_delta), 0);
  const activity = randomUUID(), grade = randomUUID();
  // Explicit HTTP fixture setup: immutable kit and saved school project, never execution evidence.
  const kit = await api(request, token, 'product-templates', 'POST', {
    name: `SIMULATED D5 kit ${run}`, subjects: [{ id: randomUUID(), name: 'Science', grades: [{ id: grade, name: 'Grade 8',
      activities: [{ id: activity, name: 'SIMULATED observation', materials: [{ id: randomUUID(), inventory_item_id: item, item_name: 'SIMULATED material', quantity: 1, unit: 'pcs' }] }],
      packing: [{ id: randomUUID(), name: 'SIMULATED box', kind: 'box', children: [{ id: randomUUID(), name: 'SIMULATED partition', kind: 'partition', children: [{ id: randomUUID(), name: 'SIMULATED pouch', kind: 'pouch', activity_ids: [activity], inventory_item_ids: [item], children: [] }] }] }],
    }], crates: [] }],
  });
  const version = await api(request, token, `product-templates/${kit.template_id}/approve`, 'POST', { revision: kit.revision });
  const site = randomUUID();
  const name = `SIMULATED D5 school journey ${run}`;
  const project = await api(request, token, 'planning-projects', 'POST', { name, client: 'SIMULATED software test', notes: '', commercial_links: [], overrides: {},
    sites: [{ id: site, name: 'SIMULATED D5 school', address: 'Synthetic only', location: '', contact: '', notes: '', schedule: '', fulfillment: 'School delivery',
      selections: [{ id: randomUUID(), version_id: version.id, context: { grade_quantities: { [grade]: 2 }, complete_sets: {} } }] }],
  });
  await mkdir(evidence, { recursive: true });
  await writeFile(`${evidence}/journey.json`, JSON.stringify({ fixture_setup: 'Authenticated HTTP: kit approval and saved project; browser transitions recorded separately', item, kit: kit.template_id, version: version.id, project: project.id, site }, null, 2));
  const aside = page.locator('aside');
  const projects = aside.getByRole('button', { name: /^Projects(?:$|\s+\d+)/ });
  if (!await projects.isVisible()) await aside.getByRole('button', { name: 'Projects & Prastuti', exact: true }).click();
  await projects.click();
  await page.getByRole('button').filter({ hasText: name }).click();
  await mutate(page, page.getByRole('button', { name: 'Calculate requirements', exact: true }), '/preview');
  const approval = page.getByRole('region', { name: 'School requirement approval' });
  await approval.getByLabel('I reviewed the saved quantities and calculated demand for every school.', { exact: true }).check();
  const approved = await mutate(page, approval.getByRole('button', { name: 'Approve saved school requirements', exact: true }), '/requirement-approvals');
  const purchasing = page.getByRole('region', { name: 'Trusted purchasing', exact: true });
  await purchasing.getByRole('button', { name: 'Refresh purchasing evidence', exact: true }).click();
  await purchasing.getByRole('combobox', { name: 'Approved material demand', exact: true }).selectOption({ index: 1 });
  await purchasing.getByLabel('Purchasing quantity', { exact: true }).fill('2');
  await purchasing.getByLabel('Purchasing reason', { exact: true }).fill('SIMULATED D5 software acceptance');
  const confirm = purchasing.getByLabel('I verified the selected source, quantity and operation.', { exact: true });
  await purchasing.getByLabel('Purchasing reason', { exact: true }).fill('SIMULATED D5 software acceptance');
  await expect(confirm).toBeEnabled(); await confirm.check();
  const pr = await mutate(page, purchasing.getByRole('button', { name: 'Create trusted PR', exact: true }), '/create');
  await purchasing.getByLabel('Purchasing reason', { exact: true }).fill('SIMULATED D5 software acceptance');
  await expect(confirm).toBeEnabled(); await confirm.check();
  await mutate(page, purchasing.getByRole('button', { name: `review trusted PR ${pr.id}`, exact: true }), '/review');
  await purchasing.getByLabel('Purchasing reason', { exact: true }).fill('SIMULATED D5 software acceptance');
  await expect(confirm).toBeEnabled(); await confirm.check();
  await mutate(page, purchasing.getByRole('button', { name: `approve trusted PR ${pr.id}`, exact: true }), '/approve');
  await expect(confirm).toBeEnabled();
  await purchasing.getByRole('combobox', { name: 'Trusted order supplier', exact: true }).selectOption({ index: 1 });
  await purchasing.getByLabel('Purchasing quantity', { exact: true }).fill('2');
  await confirm.check();
  const po = await mutate(page, purchasing.getByRole('button', { name: /^Create trusted PO/ }), '/create');
  await expect(confirm).toBeEnabled(); await confirm.check();
  await mutate(page, purchasing.getByRole('button', { name: `Review trusted PO ${po.id}`, exact: true }), '/review');
  await expect(confirm).toBeEnabled(); await confirm.check();
  await mutate(page, purchasing.getByRole('button', { name: `Approve trusted PO ${po.id}`, exact: true }), '/approve');
  const receiving = page.getByRole('region', { name: 'Trusted supplier receiving', exact: true });
  await receiving.getByRole('button', { name: 'Refresh receipt evidence', exact: true }).click();
  const queue = await api(request, token, 'supply-planning/trusted-receipts');
  const coverage = queue.coverage.find((c: any) => c.order === po.id);
  expect(coverage).toBeTruthy();
  await receiving.getByRole('combobox', { name: 'PO coverage', exact: true }).selectOption(coverage.coverage);
  await receiving.getByLabel('Receipt quantity', { exact: true }).fill('2');
  await receiving.getByRole('combobox', { name: 'Receiving location', exact: true }).selectOption({ index: 1 });
  await receiving.getByLabel('Receipt / QC reason', { exact: true }).fill('SIMULATED QC software test only');
  const receivedConfirm = receiving.getByRole('checkbox', { name: 'I verified this source, quantity, location and QC decision.', exact: true });
  await receivedConfirm.check();
  const receipt = await mutate(page, receiving.getByRole('button', { name: 'Record receipt operation', exact: true }), '/receipts');
  await expect(receivedConfirm).toBeEnabled();
  await receiving.getByRole('combobox', { name: 'Receipt operation', exact: true }).selectOption('accept');
  await receiving.getByRole('combobox', { name: 'Receipt to inspect', exact: true }).selectOption(receipt.id);
  await receivedConfirm.check();
  await mutate(page, receiving.getByRole('button', { name: 'Record receipt operation', exact: true }), '/accept');
  const entries = (await api(request, token, 'stocktakes/ledger')).filter((e: any) => e.item_id === item);
  expect(entries.reduce((sum: number, e: any) => sum + Number(e.qty_delta), 0)).toBe(before + 2);
  await writeFile(`${evidence}/journey.json`, JSON.stringify({ fixture_setup: 'Authenticated HTTP kit approval and saved school project', browser: ['school requirement approval', 'trusted PR create/review/approve', 'trusted PO create/review/approve', 'receipt and QC acceptance'], item, project: project.id, site, approval: approved.id, request: pr.id, order: po.id, receipt: receipt.id, ledger: entries }, null, 2));

  // Separate finished-item demand avoids transferring the purchasing project's existing claim.
  const fixture = (input: unknown) => JSON.parse(execFileSync(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'tests/browser/d5-production-fixture.ts'], { input: JSON.stringify(input), encoding: 'utf8', windowsHide: true, env: { ...process.env, DOTENV_CONFIG_QUIET: 'true' } }).trim().split('\n').at(-1)!);
  const finished = fixture({ mode: 'item' }).id;
  const productionActivity = randomUUID(), productionGrade = randomUUID(), productionSite = randomUUID(), productionSubject = randomUUID();
  const productionKit = await api(request, token, 'product-templates', 'POST', {
    name: `SIMULATED D5 finished kit ${run}`, subjects: [{ id: productionSubject, name: 'Science', grades: [{ id: productionGrade, name: 'Grade 8',
      activities: [{ id: productionActivity, name: 'SIMULATED finished activity', materials: [{ id: randomUUID(), inventory_item_id: finished, item_name: 'SIMULATED finished item', quantity: 1, unit: 'pcs' }] }],
      packing: [{ id: randomUUID(), name: 'SIMULATED box', kind: 'box', children: [{ id: randomUUID(), name: 'SIMULATED partition', kind: 'partition', children: [{ id: randomUUID(), name: 'SIMULATED pouch', kind: 'pouch', activity_ids: [productionActivity], inventory_item_ids: [finished], children: [] }] }] }],
    }], crates: [{ id: randomUUID(), name: 'SIMULATED Grade 8 common crate', kind: 'common', materials: [], rule: { kind: 'selected_sets', components: [{ subject_id: productionSubject, grade_id: productionGrade, quantity: 1 }] } }] }],
  });
  const productionVersion = await api(request, token, `product-templates/${productionKit.template_id}/approve`, 'POST', { revision: productionKit.revision });
  const productionName = `SIMULATED D5 production ${run}`;
  const productionProject = await api(request, token, 'planning-projects', 'POST', { name: productionName, client: 'SIMULATED software test', notes: '', commercial_links: [], overrides: {}, sites: [{ id: productionSite, name: 'SIMULATED finished school', address: 'Synthetic only', location: '', contact: '', notes: '', schedule: '', fulfillment: 'School delivery', selections: [{ id: randomUUID(), version_id: productionVersion.id, context: { grade_quantities: { [productionGrade]: 2 }, complete_sets: {} } }] }] });
  await page.getByRole('button', { name: /Back to projects/i }).click();
  const refreshed = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/refresh-token') && r.status() === 200);
  await page.reload();
  token = (await (await refreshed).json()).token;
  await aside.getByRole('button', { name: 'Projects & Prastuti', exact: true }).click();
  await projects.click();
  await page.getByRole('button').filter({ hasText: productionName }).click();
  await mutate(page, page.getByRole('button', { name: 'Calculate requirements', exact: true }), '/preview');
  await approval.getByLabel('I reviewed the saved quantities and calculated demand for every school.', { exact: true }).check();
  const productionApproval = await mutate(page, approval.getByRole('button', { name: 'Approve saved school requirements', exact: true }), '/requirement-approvals');
  const recipe = fixture({ token, operation: { action: 'publishRecipe', key: randomUUID(), input: { name: 'SIMULATED D5 recipe', definition: { output_item_id: finished, unit: 'pcs', yield_quantity: '1', instructions: 'SIMULATED software fixture', specification: '', concentration: '', inputs: [{ item_id: item, quantity: '1', canonical_quantity: '1', unit: 'pcs', scrap_percent: '0' }] } } } });
  const order = fixture({ token, operation: { action: 'claimWorkOrder', key: randomUUID(), input: { project: productionProject.id, site: productionSite, approval: productionApproval.id, demandRevision: 1, recipe: recipe.id, quantity: '2', unit: 'pcs', source: randomUUID() } } });
  await writeFile(`${evidence}/production.json`, JSON.stringify({ fixtures: 'Catalog item, kit/project, recipe publication and work-order claim; no execution fixtures', finished, project: productionProject.id, site: productionSite, recipe: recipe.id, order: order.id }, null, 2));
  const production = page.getByRole('region', { name: 'Authorized production', exact: true });
  await production.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await production.getByRole('combobox', { name: 'Work order', exact: true }).selectOption(order.id);
  await production.getByRole('combobox', { name: 'Material', exact: true }).selectOption({ index: 1 });
  await production.getByRole('textbox', { name: 'Quantity (pcs)', exact: true }).fill('2');
  await production.getByRole('textbox', { name: 'Verified stock location', exact: true }).fill(stock.ledger[0].physical_location);
  await production.getByRole('textbox', { name: 'Reason', exact: true }).fill('SIMULATED software issue');
  await production.getByRole('checkbox', { name: /^I confirm/ }).check();
  const issue = await mutate(page, production.getByRole('button', { name: 'Confirm material issue', exact: true }), '/material-issues');
  await production.getByRole('combobox', { name: 'Operation', exact: true }).selectOption('output');
  await production.getByRole('textbox', { name: 'Quantity (pcs)', exact: true }).fill('2');
  await production.getByRole('textbox', { name: 'Output custody location', exact: true }).fill('SIMULATED D5 QC bench');
  await production.getByRole('checkbox', { name: /^I confirm/ }).check();
  const output = await mutate(page, production.getByRole('button', { name: 'Record pending-QC output', exact: true }), '/finished-outputs');
  await writeFile(`${evidence}/production.json`, JSON.stringify({ finished, project: productionProject.id, site: productionSite, recipe: recipe.id, order: order.id, issue, output }, null, 2));
  const packing = page.getByRole('region', { name: 'Trusted packing and QC', exact: true });
  await packing.getByRole('button', { name: 'Refresh packing evidence', exact: true }).click();
  await packing.getByRole('combobox', { name: 'Available output', exact: true }).selectOption(output.id);
  const plan = await mutate(page, packing.getByRole('button', { name: 'Create frozen school plan', exact: true }), '/plans');
  await packing.getByRole('combobox', { name: 'School plan', exact: true }).selectOption(plan.id);
  const view = await api(request, token, 'production-planning/trusted-packing');
  const frozen = view.plans.find((p: any) => p.id === plan.id);
  for (const pack of frozen.snapshot.packages) for (const line of pack.materials) {
    await packing.getByRole('combobox', { name: 'Physical package', exact: true }).selectOption(pack.id);
    await packing.getByRole('combobox', { name: 'Frozen material', exact: true }).selectOption(line.line_id);
    await packing.getByRole('combobox', { name: 'Matching output', exact: true }).selectOption(output.id);
    await packing.getByRole('textbox', { name: 'Allocation quantity', exact: true }).fill(line.quantity);
    await mutate(page, packing.getByRole('button', { name: 'Allocate physical output', exact: true }), '/allocations');
    await expect(packing.getByRole('button', { name: 'Refresh packing evidence', exact: true })).toBeEnabled();
  }
  const depth = (p: any): number => p.parent_id ? 1 + depth(frozen.snapshot.packages.find((x: any) => x.id === p.parent_id)) : 0;
  for (const pack of [...frozen.snapshot.packages].sort((a: any, b: any) => depth(b) - depth(a))) {
    if (pack.kind === 'common_crate' && !pack.materials.length) continue;
    await packing.getByRole('combobox', { name: 'Physical package', exact: true }).selectOption(pack.id);
    for (const check of ['material', 'quantity', 'placement', 'packaging', 'stickers', 'instructions']) {
      await packing.getByRole('checkbox', { name: `${check} passed`, exact: true }).check();
      await packing.getByRole('textbox', { name: `${check} evidence`, exact: true }).fill(`SIMULATED ${check}: isolated software acceptance only`);
    }
    await packing.getByRole('textbox', { name: 'Inspection notes', exact: true }).fill('SIMULATED QC; no physical inspection or pilot approval');
    await packing.getByRole('checkbox', { name: 'I physically inspected this package and confirm the recorded evidence.', exact: true }).check();
    await mutate(page, packing.getByRole('button', { name: 'Accept six-check QC', exact: true }), '/inspections');
    await expect(packing.getByText(/Inspector:/)).toBeVisible();
  }
  const packed = (await api(request, token, 'production-planning/trusted-packing')).plans.find((p: any) => p.id === plan.id);
  expect(packed.allocations.reduce((n: number, a: any) => n + Number(a.quantity), 0)).toBe(2);
  await writeFile(`${evidence}/packing.json`, JSON.stringify(packed, null, 2));
  const delivery = page.getByRole('region', { name: 'Trusted dispatch, delivery and closure', exact: true });
  await delivery.getByRole('button', { name: 'Refresh delivery evidence', exact: true }).click();
  await delivery.getByRole('combobox', { name: 'Dispatch school plan', exact: true }).selectOption(plan.id);
  const roots = delivery.getByRole('group', { name: /^Eligible complete assemblies/ }).getByRole('checkbox');
  await expect(roots).toHaveCount(2);
  await roots.nth(0).check(); await roots.nth(1).check();
  await delivery.getByRole('textbox', { name: 'Carrier', exact: true }).fill('SIMULATED carrier');
  await delivery.getByRole('textbox', { name: 'Vehicle', exact: true }).fill('SIMULATED vehicle');
  await delivery.getByLabel('Planned dispatch time', { exact: true }).fill('2026-10-28T12:00');
  await delivery.getByRole('textbox', { name: 'Evidence / notes', exact: true }).fill('SIMULATED software custody evidence');
  const deliveryConfirm = delivery.getByRole('checkbox', { name: 'I verified the selected physical units, school and evidence for this action.', exact: true });
  await deliveryConfirm.check();
  const dispatch = await mutate(page, delivery.getByRole('button', { name: 'Confirm dispatch custody', exact: true }), '/dispatches');
  await delivery.getByRole('combobox', { name: 'Dispatched school assemblies', exact: true }).selectOption(dispatch.id);
  await delivery.getByRole('button', { name: 'Preview dispatch manifest', exact: true }).click();
  const downloadWait = page.waitForEvent('download');
  await delivery.getByRole('button', { name: 'Download dispatch manifest', exact: true }).click();
  const download = await downloadWait;
  expect(download.suggestedFilename()).toBe(`dispatch-${dispatch.id}.pdf`);
  await download.saveAs(`${evidence}/dispatch-${dispatch.id}.pdf`);
  expect((await readFile(`${evidence}/dispatch-${dispatch.id}.pdf`)).subarray(0, 4).toString()).toBe('%PDF');
  await delivery.getByRole('textbox', { name: 'Recipient (for receipt or acceptance)', exact: true }).fill('SIMULATED school recipient');
  await delivery.getByLabel('Actual receiving time', { exact: true }).fill(new Date().toISOString().slice(0, -1));
  const receive = delivery.getByRole('group', { name: 'Actually received assemblies', exact: true }).getByRole('checkbox');
  await receive.nth(0).check(); await deliveryConfirm.check();
  const partialReceipt = await mutate(page, delivery.getByRole('button', { name: 'Record evidenced school receipt', exact: true }), '/acknowledgments');
  await expect(receive).toHaveCount(1);
  const progressPath = `production-planning/trusted-delivery/projects/${productionProject.id}/progress`;
  const partial = await api(request, token, progressPath);
  expect(partial.schools[0].delivered).toBe(1); expect(partial.schools[0].packages).toBe(2);
  await expect(delivery.getByRole('button', { name: 'Record recipient acceptance and close project', exact: true })).toBeDisabled();
  await receive.nth(0).check(); await deliveryConfirm.check();
  const finalReceipt = await mutate(page, delivery.getByRole('button', { name: 'Record evidenced school receipt', exact: true }), '/acknowledgments');
  await expect(receive).toHaveCount(0);
  await delivery.getByRole('combobox', { name: 'Installation school', exact: true }).selectOption(productionSite);
  await delivery.getByRole('textbox', { name: 'Required installation task', exact: true }).fill('SIMULATED installation task');
  await deliveryConfirm.check();
  const installation = await mutate(page, delivery.getByRole('button', { name: 'Record installation requirement', exact: true }), '/installations');
  await expect(deliveryConfirm).toBeEnabled(); await deliveryConfirm.check();
  await mutate(page, delivery.getByRole('checkbox', { name: 'SIMULATED installation task (required)', exact: true }), '/installation-actions');
  await expect(deliveryConfirm).toBeEnabled(); await deliveryConfirm.check();
  await mutate(page, delivery.getByRole('button', { name: 'Save installation evidence', exact: true }), '/installation-actions');
  await expect(deliveryConfirm).toBeEnabled(); await deliveryConfirm.check();
  await mutate(page, delivery.getByRole('button', { name: 'Submit installer completion', exact: true }), '/installation-actions');
  await expect(deliveryConfirm).toBeEnabled(); await deliveryConfirm.check();
  await mutate(page, delivery.getByRole('button', { name: 'Record installation recipient acceptance', exact: true }), '/installation-actions');
  await expect(deliveryConfirm).toBeEnabled(); await deliveryConfirm.check();
  const closure = await mutate(page, delivery.getByRole('button', { name: 'Record recipient acceptance and close project', exact: true }), '/closure');
  const complete = await api(request, token, progressPath);
  expect(complete.completion.status).toBe('closed'); expect(complete.blockers).toEqual([]);
  expect(complete.schools[0].delivered).toBe(2); expect(complete.schools[0].installation.status).toBe('completed');
  await writeFile(`${evidence}/delivery.json`, JSON.stringify({ dispatch, partialReceipt, partial, finalReceipt, installation, closure, complete }, null, 2));
  await writeFile(`${evidence}/recovery-evidence.json`, JSON.stringify({ schema: process.env.DATABASE_SCHEMA,
    browser_output: output.id, browser_plan: dispatch.plan_id,
    delivery: { requests: browserMutations.filter(r => ['dispatches', 'acknowledgments'].includes(r.path)) } }, null, 2));
});
