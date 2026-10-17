// Read-only reconciliation against synthetic loopback PostgreSQL only.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/experimind_kitbuilder_development');
const db = new pg.Client({ connectionString: url.href }); await db.connect();
const output = process.env.PROJECTS_WORKSPACE_EVIDENCE_DIR || '.local-dev/ux-13j'; await mkdir(output, { recursive: true });
const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
const admin = accounts.find(a => a.role === 'admin' && a.organization === 'Kit Builder Development'); assert(admin);
const base = 'http://127.0.0.1:3101/api/v1';
const login = await fetch(`${base}/auth/login`, { signal: AbortSignal.timeout(8000), method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: admin.password }) });
if (!login.ok) throw new Error(`Synthetic login failed (${login.status}): ${(await login.json()).error}`);
const { token } = await login.json();
const api = async (path, method = 'GET', body) => {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000), method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert(response.ok, `${method} ${path}: ${response.status}`); return response.json();
};
const fingerprint = async () => {
  const result = {};
  // Authentication changes login counters/timestamps, never business state.
  const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('users','refresh_tokens','auth_sessions') ORDER BY tablename")).rows;
  for (const { tablename } of tables) result[tablename] = (await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${tablename}" t`)).rows[0];
  return result;
};
try {
  if (process.argv[2] === 'baseline') {
    const projects = await api('/planning-projects');
    const report = { before: await fingerprint(), projects, checked: [] };
    for (const project of projects) {
      const detail = await api(`/planning-projects/workspace/projects/${project.id}`);
      assert.deepEqual(detail.project, await api(`/planning-projects/${project.id}`));
      assert.deepEqual(detail.history, await api(`/planning-projects/${project.id}/revisions`));
      assert.deepEqual(detail.preview, await api(`/planning-projects/${project.id}/preview`, 'POST', { revision: detail.project.revision }));
      assert.equal(detail.preview.revision, detail.project.revision);
      report.checked.push({ id: project.id, name: project.name, schools: detail.project.sites.map(s => ({ id: s.id, name: s.name, selections: s.selections.length })), materials: detail.preview.materials.length });
    }
    assert.deepEqual(await fingerprint(), report.before);
    await writeFile(`${output}/reconciliation.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ tables: Object.keys(report.before).length, projects: report.checked }));
  } else {
    const report = JSON.parse(await readFile(`${output}/reconciliation.json`, 'utf8'));
    report.after = await fingerprint(); assert.deepEqual(report.after, report.before);
    assert.deepEqual(await api('/planning-projects'), report.projects);
    if (process.argv[2] === 'rollback') {
      assert.deepEqual(await api('/planning-projects/workspace-access'), { enabled: false });
      const response = await fetch(`${base}/planning-projects/workspace/projects`, { signal: AbortSignal.timeout(8000), headers: { Authorization: `Bearer ${token}` } }); assert.equal(response.status, 404);
    }
    await writeFile(`${output}/${process.argv[2] === 'rollback' ? 'rollback' : 'verified'}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ mode: process.argv[2], tablesUnchanged: Object.keys(report.before).length, projects: report.checked.length }));
  }
} finally { await db.end(); }
