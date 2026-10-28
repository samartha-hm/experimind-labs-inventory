import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

test('SYNTHETIC TEST EVIDENCE: authenticated preparation, blank exports and responsive gates', async ({page, request}) => {
  const target = new URL(process.env.DATABASE_URL!);
  expect(target.hostname).toBe('127.0.0.1'); expect(target.port).toBe('55432');
  expect(target.pathname).toBe('/experimind_kitbuilder_test');
  expect(process.env.DATABASE_SCHEMA).toMatch(/^requirement_test_[a-f0-9]{32}$/);
  const account = JSON.parse(await readFile(process.env.D5_BROWSER_ACCOUNT ?? '.local-dev/d50-browser-account.json', 'utf8'));
  expect((await request.get('/api/v1/stocktakes/operational-readiness')).status()).toBe(401);
  await page.goto('/');
  await page.getByRole('textbox', {name: /email/i}).fill(account.email);
  await page.locator('input[type=password]').fill(account.password);
  const signedIn = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', {name: 'Sign In', exact: true}).click();
  const loginResponse = await signedIn;
  expect(loginResponse.status(), 'Synthetic operator login').toBe(200);
  await expect(page.getByRole('button', {name: 'Sign Out', exact: true})).toBeVisible();
  const aside = page.locator('aside');
  const stock = aside.getByRole('button', {name: /^Items & stock/});
  if (!await stock.isVisible()) await aside.getByRole('button', {name: 'Inventory', exact: true}).click();
  await stock.click();
  const readiness = page.getByRole('region', {name: 'Operational pilot preparation — NO-GO'});
  await expect(readiness.getByRole('heading', {name: 'Operational pilot approval', exact: true})).toBeVisible();
  await expect(readiness).toContainText('Physical stock and valuation remain UNKNOWN');
  for (const viewport of [{width: 390, height: 844}, {width: 1024, height: 768}, {width: 1440, height: 1000}]) {
    await page.setViewportSize(viewport);
    const box = await readiness.boundingBox();
    expect(box).not.toBeNull(); expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    await readiness.getByRole('button', {name: 'Refresh readiness'}).click();
    await expect(readiness.getByRole('heading', {name: 'Operational pilot approval', exact: true})).toBeVisible();
  }
  await readiness.getByText('Printer and scanner practical acceptance', {exact: true}).click();
  await expect(readiness).toContainText('NOT TESTED');
  const downloaded = page.waitForEvent('download');
  await readiness.getByRole('button', {name: 'Export unsigned preparation pack'}).click();
  const pack = JSON.parse(await readFile((await (await downloaded).path())!, 'utf8'));
  expect(pack.pilot).toBe('NO-GO'); expect(pack.evidence_acceptance_available).toBe(false);
  expect(pack.submission.supervisor_id).toBeNull();
  const session = page.getByRole('combobox', {name: /^Stocktake/});
  const values = await session.locator('option').evaluateAll(options => options.map(option => (option as HTMLOptionElement).value).filter(Boolean));
  expect(values.length).toBeGreaterThan(0);
  await session.selectOption(values[0]);
  await page.getByRole('button', {name: 'Prepare blind count sheet', exact: true}).click();
  const sheet = page.getByRole('region', {name: 'Blind count preparation'});
  await expect(sheet.getByRole('table')).toBeVisible();
  const exportSheet = page.waitForEvent('download');
  await sheet.getByRole('button', {name: 'Export unsigned blank count sheet', exact: true}).click();
  const blank = JSON.parse(await readFile((await (await exportSheet).path())!, 'utf8'));
  expect(blank.rows.length).toBeGreaterThan(0);
  for (const row of blank.rows) {expect(row.quantity).toBeNull(); expect(row.physical_status).toBe('UNKNOWN');}
  expect(blank.opening_balance_posting).toBe('NOT AUTHORIZED');
});
