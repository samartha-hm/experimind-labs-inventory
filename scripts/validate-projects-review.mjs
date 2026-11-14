// Read-only evidence for 13L. Never creates or approves business records.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/experimind_kitbuilder_development', 'Synthetic loopback database required');
const db = new pg.Client({ connectionString: url.href }); await db.connect();
const output = '.local-dev/ux-13l'; await mkdir(output, { recursive: true });
try {
  const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
  const admin = accounts.find(a => a.role === 'admin' && a.organization === 'Kit Builder Development'); assert(admin);
  const base = 'http://127.0.0.1:3101/api/v1';
  const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: admin.password }), signal: AbortSignal.timeout(8000) });
  assert(login.ok, `Synthetic login ${login.status}`);
  const { token } = await login.json();
  const request = (path, method = 'GET', body, authenticated = true) => fetch(`${base}${path}`, {
    method, headers: { ...(authenticated ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(8000),
  });
  const api = async path => { const response = await request(path); assert(response.ok, `${path}: ${response.status}`); return response.json(); };
  const fingerprint = async () => {
    const result = {};
    // Session/login timestamps excluded; all business tables, including immutable history, included.
    for (const { tablename } of (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('users','refresh_tokens','auth_sessions') ORDER BY tablename")).rows) {
      assert(/^[a-z_]+$/.test(tablename));
      result[tablename] = (await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${tablename}" t`)).rows[0];
    }
    return result;
  };
  const current = [];
  for (const project of await api('/planning-projects')) current.push({ project: await api(`/planning-projects/${project.id}`), history: await api(`/planning-projects/${project.id}/revisions`) });
  const mode = process.argv[2];
  if (mode === 'baseline') {
    await writeFile(`${output}/baseline.json`, JSON.stringify({ fingerprints: await fingerprint(), current }, null, 2));
    console.log(JSON.stringify(current.map(p => ({ id: p.project.id, name: p.project.name, revision: p.project.revision, schools: p.project.sites.length }))));
  } else {
    assert(['verify', 'restart', 'rollback'].includes(mode), 'Use baseline, verify, restart or rollback');
    const before = JSON.parse(await readFile(`${output}/baseline.json`, 'utf8'));
    assert.deepEqual(current, before.current, 'Legacy records/history changed');
    const statuses = [];
    if (mode === 'rollback') assert.deepEqual(await api('/planning-projects/workspace-access'), { enabled: false });
    else {
      for (const { project, history } of current) {
        const detail = await api(`/planning-projects/workspace/projects/${project.id}`);
        assert.deepEqual(detail.project, project); assert.deepEqual(detail.history, history); assert.equal(detail.preview.revision, project.revision);
      }
      const project = current.find(p => p.project.sites.length > 1)?.project; assert(project);
      const path = `/planning-projects/workspace/projects/${project.id}/approve`;
      statuses.push((await request(path, 'POST', { revision: project.revision }, false)).status);
      statuses.push(...await Promise.all([project.revision, 1, project.revision].map(async revision => (await request(path, 'POST', { revision })).status)));
      statuses.push((await request(path, 'POST', { revision: project.revision })).status);
      assert.deepEqual(statuses, [401, 405, 405, 405, 405]);
    }
    const after = await fingerprint(); assert.deepEqual(after, before.fingerprints, 'Business table changed during read-only review');
    const report = { mode, tables: Object.keys(after).length, changed: [], projects: current.length, historiesUnchanged: true, approvalProbeStatuses: statuses, fingerprints: after };
    await writeFile(`${output}/${mode}.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, fingerprints: undefined }));
  }
} finally { await db.end(); }
