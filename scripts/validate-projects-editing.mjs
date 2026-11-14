// Read-only evidence collection; all edits must go through authenticated planning APIs.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import pg from 'pg';
const url = new URL(process.env.DATABASE_URL);
assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/experimind_kitbuilder_development', 'Synthetic loopback database required');
const db = new pg.Client({ connectionString: url.href }); await db.connect();
const output = '.local-dev/ux-13k'; await mkdir(output, { recursive: true });
const accounts = JSON.parse(await readFile('.local-dev/pilot-accounts.json', 'utf8'));
const admin = accounts.find(a => a.role === 'admin' && a.organization === 'Kit Builder Development'); assert(admin);
try {
  if (process.argv[2] === 'organization') {
    console.log((await db.query('SELECT organization_id FROM users WHERE email=$1', [admin.email])).rows[0].organization_id);
  } else {
    const base = 'http://127.0.0.1:3101/api/v1';
    const login = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: admin.password }), signal: AbortSignal.timeout(8000) });
    assert(login.ok, `Synthetic login ${login.status}`);
    const { token, user } = await login.json();
    const api = async path => {
      const r = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
      assert(r.ok, `${path}: ${r.status}`); return r.json();
    };
    const fingerprint = async () => {
      const result = {};
      // Login timestamps/session bookkeeping are outside business reconciliation.
      for (const { tablename } of (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('users','refresh_tokens','auth_sessions') ORDER BY tablename")).rows) {
        assert(/^[a-z_]+$/.test(tablename));
        result[tablename] = (await db.query(`SELECT count(*)::int rows, md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM "${tablename}" t`)).rows[0];
      }
      return result;
    };
    const projects = await api('/planning-projects');
    const current = [];
    for (const p of projects) current.push({ project: await api(`/planning-projects/${p.id}`), history: await api(`/planning-projects/${p.id}/revisions`) });
    if (process.argv[2] === 'baseline') {
      await writeFile(`${output}/baseline.json`, JSON.stringify({ fingerprints: await fingerprint(), current, actor: user.id }, null, 2));
      console.log(JSON.stringify(current.map(p => ({ id: p.project.id, name: p.project.name, revision: p.project.revision, schools: p.project.sites.map(s => ({ id: s.id, name: s.name, selections: s.selections.length })) }))));
    } else {
      const before = JSON.parse(await readFile(`${output}/baseline.json`, 'utf8'));
      const after = await fingerprint();
      assert.deepEqual(Object.keys(after), Object.keys(before.fingerprints));
      const changed = Object.keys(after).filter(t => JSON.stringify(after[t]) !== JSON.stringify(before.fingerprints[t]));
      assert(changed.every(t => ['planning_projects', 'planning_sites', 'planning_version_links', 'planning_project_revisions'].includes(t)), `Unexpected changes: ${changed}`);
      assert.equal(current.length, before.current.length);
      const revisions = [];
      for (const old of before.current) {
        const now = current.find(p => p.project.id === old.project.id); assert(now);
        for (const snapshot of old.history) assert.deepEqual(now.history.find(h => h.revision === snapshot.revision), snapshot, 'Historical snapshot changed');
        const added = now.history.filter(h => h.revision > old.project.revision);
        assert.equal(added.length, now.project.revision - old.project.revision);
        for (const snapshot of added) { assert.equal(snapshot.updated_by, before.actor); assert.equal(snapshot.archived, false); }
        if (added.length) revisions.push({ id: now.project.id, before: old.project.revision, after: now.project.revision, added: added.length });
        if (process.argv[2] !== 'rollback') {
          const detail = await api(`/planning-projects/workspace/projects/${now.project.id}`);
          assert.deepEqual(detail.project, now.project); assert.deepEqual(detail.history, now.history);
          assert.equal(detail.preview.revision, now.project.revision);
        }
      }
      if (process.argv[2] === 'rollback') assert.deepEqual(await api('/planning-projects/workspace-access'), { enabled: false });
      const report = { mode: process.argv[2], tables: Object.keys(after).length, changed, unchanged: Object.keys(after).length - changed.length, revisions, fingerprints: after };
      await writeFile(`${output}/${process.argv[2] || 'verify'}.json`, JSON.stringify(report, null, 2));
      console.log(JSON.stringify({ ...report, fingerprints: undefined }));
    }
  }
} finally { await db.end(); }
