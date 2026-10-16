// Synthetic fixture setup and API reconciliation. UI actions run separately in the browser.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/experimind_kitbuilder_development');
const db = new pg.Client({ connectionString: url.href }); await db.connect();
const output = '.local-dev/ux-13i'; await mkdir(output, { recursive: true });
const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
const admin = accounts.find(a => a.role === 'admin' && a.organization === 'Kit Builder Development'); assert(admin);
const base = 'http://127.0.0.1:3101/api/v1';
const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: admin.password }) }); assert(login.ok);
const { token } = await login.json();
const api = async (method, path, body) => {
  const response = await fetch(`${base}/packing${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Idempotency-Key': randomUUID() }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert(response.ok, `${method} ${path}: ${response.status} ${await response.clone().text()}`); return response.json();
};
const fingerprint = async () => {
  const result = {};
  for (const table of ['inventory_items','stock_ledger','project_stock_reservations','packing_picks','planning_projects','planning_sites','product_template_versions','production_work_orders','production_input_reservations','production_input_issues','production_batches','production_qc_decisions','delivery_orders','delivery_package_claims']) {
    result[table] = (await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${table} t`)).rows[0];
  }
  return result;
};
try {
  if (process.argv[2] === 'setup') {
    const item = (await db.query(`SELECT i.id,i.unit,s.physical_location FROM inventory_items i JOIN organizations o ON o.id=i.organization_id JOIN stock_ledger s ON s.item_id=i.id AND s.organization_id=i.organization_id WHERE o.name=$1 AND i.name LIKE 'Browser material %' AND s.verification_entry_id IS NOT NULL GROUP BY i.id,i.unit,s.physical_location HAVING sum(s.qty_delta)>=1 ORDER BY i.id LIMIT 1`, ['Kit Builder Development'])).rows[0]; assert(item, 'Verified synthetic material required');
    let fixture = await api('POST', '/orders', { batch_code: `13I-SYNTHETIC-${Date.now()}`, manual: { name: '13I synthetic inspection evidence only', materials: [{ item_id: item.id, quantity: '1', unit: item.unit }] } });
    fixture = await api('POST', `/orders/${fixture.id}/release`, { revision: fixture.revision });
    fixture = await api('POST', `/orders/${fixture.id}/picks`, { revision: fixture.revision, item_id: item.id, quantity: '1', unit: item.unit, location: item.physical_location });
    const pkg = fixture.snapshot.packages.at(-1); assert(pkg);
    fixture = await api('POST', `/orders/${fixture.id}/checklist`, { revision: fixture.revision, package_ids: [pkg.id], assembled: true, notes: 'Synthetic fixture assembly before inspection baseline' });
    const report = { fixture: { order: fixture.id, package: pkg.id, code: pkg.code }, before: await fingerprint(), orderBefore: await api('GET', `/orders/${fixture.id}`) };
    await writeFile(`${output}/reconciliation.json`, JSON.stringify(report, null, 2)); console.log(JSON.stringify(report.fixture));
  } else {
    const report = JSON.parse(await readFile(`${output}/reconciliation.json`, 'utf8'));
    report.after = await fingerprint(); report.orderAfter = await api('GET', `/orders/${report.fixture.order}`);
    assert.deepEqual(report.before, report.after);
    if (process.argv[2] === 'rollback') {
      const prior = JSON.parse(await readFile(`${output}/verified.json`, 'utf8'));
      assert.deepEqual(report.orderAfter, prior.orderAfter);
      const workspace = await api('GET', '/workspace'); assert.equal(workspace.enabled, false); assert.equal(workspace.execution_enabled, false);
    } else {
      const before = report.orderBefore, after = report.orderAfter;
      assert.equal(after.order.status, 'packing');
      assert.equal(after.order.revision, before.order.revision + 2);
      assert.equal(after.history.length, before.history.length + 2);
      for (const [key,value] of Object.entries(before.order)) if (!['revision','execution','updated_by','updated_at'].includes(key)) assert.deepEqual(after.order[key], value);
      assert.deepEqual(after.order.execution.exceptions, before.order.execution.exceptions);
      assert.deepEqual(after.order.execution.changes, before.order.execution.changes);
      const p = after.order.execution.progress[report.fixture.package];
      assert.equal(p.qc, 'rejected'); assert.equal(p.checked_by, after.order.updated_by); assert(p.checked_at); assert.equal(p.notes, '13I synthetic second inspection');
      assert.equal(p.checks.material, false); assert(Object.entries(p.checks).filter(([key]) => key !== 'material').every(([,value]) => value === true));
      for (const h of after.history.slice(0,2)) assert.equal(h.actor_id, p.checked_by);
      await writeFile(`${output}/verified.json`, JSON.stringify(report, null, 2));
    }
    console.log(JSON.stringify({ mode: process.argv[2], tablesUnchanged: Object.keys(report.before).length, revision: report.orderAfter.order.revision, history: report.orderAfter.history.length }));
  }
} finally { await db.end(); }
