// Local synthetic paired recovery only. No source writes, cleanup, or --clean.
import pg from 'pg';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, readdir, lstat, copyFile, access } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
const sourceUrl = new URL(process.env.DATABASE_URL ?? '');
if (sourceUrl.hostname !== '127.0.0.1' || sourceUrl.port !== '55432' || sourceUrl.pathname !== '/experimind_kitbuilder_development') throw Error('Refusing non-isolated source');
const tools = resolve(process.argv[2] ?? '');
if (!process.argv[2] || !isAbsolute(process.argv[2])) throw Error('Supply absolute PostgreSQL bin path');
const stamp = new Date().toISOString().replace(/\D/g, '');
const targetName = `experimind_pilot_restore_${stamp}`;
const base = resolve('.local-dev/recovery', stamp);
const backupRoot = join(base, 'backup'), restoredRoot = join(base, 'restored-objects');
const objectRoot = resolve(process.env.ATTACHMENT_STORAGE_ROOT ?? '.local-dev/attachments');
const localRoot = resolve('.local-dev');
if (!relative(localRoot, objectRoot) || relative(localRoot, objectRoot).startsWith('..') || isAbsolute(relative(localRoot, objectRoot))) throw Error('Objects must be in the isolated .local-dev tree');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
// PostgreSQL reparses varchar literal arrays during restore: casting the
// complete array to text[] becomes identical per-element text casts. Normalize
// only this literal-only form; preserve every other schema difference.
const normalizeSchema = sql => sql.split('\n').filter(line => !/^\\(un)?restrict /.test(line)).join('\n')
  .replace(/\(ARRAY\[((?:'(?:[^']|'')*'::character varying)(?:, '(?:[^']|'')*'::character varying)*)\]\)::text\[\]/g,
    (_, values) => `ARRAY[${values.replace(/'(?:[^']|'')*'::character varying/g, value => `(${value})::text`)}]`);
const quote = name => '"' + name.replaceAll('"', '""') + '"';
const privateEnv = { ...process.env, PGHOST: sourceUrl.hostname, PGPORT: sourceUrl.port, PGUSER: decodeURIComponent(sourceUrl.username), PGPASSWORD: decodeURIComponent(sourceUrl.password), PGDATABASE: sourceUrl.pathname.slice(1) };
async function run(tool, args, env = privateEnv) {
  await access(join(tools, `${tool}.exe`));
  return new Promise((ok, fail) => {
    const proc = spawn(join(tools, `${tool}.exe`), args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    proc.stdout.on('data', chunk => { stdout += chunk; }); proc.stderr.on('data', chunk => { stderr += chunk; });
    proc.on('error', fail); proc.on('close', code => code === 0 ? ok(stdout.trim()) : fail(Error(`${tool} failed (${code}): ${stderr}`)));
  });
}
async function tree(root, destination) {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw Error('Unsafe object root');
  const output = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name), stat = await lstat(path);
      if (stat.isSymbolicLink() || (!stat.isDirectory() && (!stat.isFile() || stat.nlink !== 1))) throw Error('Unsafe object tree');
      if (stat.isDirectory()) { await walk(path); continue; }
      const key = relative(root, path).replaceAll('\\', '/');
      const bytes = await readFile(path); output.push({ key, size: bytes.length, digest: hash(bytes) });
      if (destination) { const target = join(destination, key); await mkdir(resolve(target, '..'), { recursive: true }); await copyFile(path, target, 1); }
    }
  }
  await walk(root); return output.sort((a,b) => a.key.localeCompare(b.key));
}
async function snapshot(client, tables) {
  const output = {};
  for (const { tablename } of tables) {
    const rows = (await client.query(`SELECT to_jsonb(t)::text row FROM public.${quote(tablename)} t ORDER BY to_jsonb(t)::text COLLATE "C"`)).rows;
    output[tablename] = { count: rows.length, digest: hash(rows.map(r => r.row).join('\n')) };
  }
  const sequences = (await client.query("SELECT sequencename FROM pg_sequences WHERE schemaname='public' ORDER BY sequencename")).rows;
  for (const { sequencename } of sequences) output[`sequence:${sequencename}`] = (await client.query(`SELECT last_value::text,is_called FROM public.${quote(sequencename)}`)).rows;
  return output;
}
async function verify(client, objects) {
  const attachments = (await client.query('SELECT id,organization_id,size,digest FROM private_attachments')).rows;
  for (const record of attachments) {
    const file = objects.find(f => f.key === `${record.organization_id}/${record.id}`);
    if (!file || file.size !== record.size || file.digest !== record.digest) throw Error('Attachment record/file mismatch');
  }
  const checks = {
    tenantUsers: 'SELECT count(*)::int failures FROM users u LEFT JOIN organizations o ON o.id=u.organization_id WHERE o.id IS NULL',
    ledgerItems: 'SELECT count(*)::int failures FROM stock_ledger l LEFT JOIN inventory_items i ON i.id=l.item_id AND i.organization_id=l.organization_id WHERE i.id IS NULL',
    // Legacy inventory.quantity is intentionally preserved and unverified. The
    // authoritative Kit Builder balance is the verified location ledger.
    balances: `SELECT count(*)::int failures FROM (SELECT running_balance,physical_sequence,
      sum(qty_delta) OVER(PARTITION BY organization_id,item_id,physical_location ORDER BY physical_sequence ROWS UNBOUNDED PRECEDING) balance,
      row_number() OVER(PARTITION BY organization_id,item_id,physical_location ORDER BY physical_sequence) sequence
      FROM stock_ledger WHERE verification_entry_id IS NOT NULL) l WHERE running_balance<>balance OR balance<0 OR physical_sequence<>sequence`,
    verifiedScopes: `SELECT count(*)::int failures FROM stock_ledger l LEFT JOIN physical_stock_scopes s ON s.organization_id=l.organization_id AND s.item_id=l.item_id
      WHERE l.verification_entry_id IS NOT NULL AND (s.id IS NULL OR s.unit<>l.verified_unit OR NOT s.locations ? l.physical_location)`,
    picks: 'SELECT count(*)::int failures FROM packing_picks p LEFT JOIN stock_ledger l ON l.id=p.ledger_id AND l.organization_id=p.organization_id AND l.packing_pick_id=p.id AND l.qty_delta=-p.quantity WHERE l.id IS NULL',
    orphanPicks: 'SELECT count(*)::int failures FROM stock_ledger l LEFT JOIN packing_picks p ON p.id=l.packing_pick_id AND p.ledger_id=l.id AND p.organization_id=l.organization_id WHERE l.packing_pick_id IS NOT NULL AND p.id IS NULL',
  };
  for (const [name, sql] of Object.entries(checks)) if ((await client.query(sql)).rows[0].failures) throw Error(`Integrity check failed: ${name}`);
  return { attachments: attachments.length, extraObjects: objects.filter(f => !attachments.some(a => f.key === `${a.organization_id}/${a.id}`)).map(f => f.key), checks: Object.keys(checks) };
}
const source = new pg.Client({ connectionString: sourceUrl.href });
let restored;
try {
  const versions = {};
  for (const tool of ['pg_dump', 'pg_restore', 'psql', 'createdb']) {
    versions[tool] = await run(tool, ['--version']);
    if (!/\b17\./.test(versions[tool])) throw Error('Client major must be 17');
  }
  if (process.argv[3]) {
    if (process.argv[3] !== '--validate' || !isAbsolute(process.argv[4] ?? '')) throw Error('Expected --validate <absolute rehearsal directory>');
    const existingBase = resolve(process.argv[4]);
    const rel = relative(resolve('.local-dev/recovery'), existingBase);
    if (!rel || rel.startsWith('..') || isAbsolute(rel)) throw Error('Validation must stay in the isolated recovery tree');
    const saved = JSON.parse(await readFile(join(existingBase, 'backup', 'manifest.json'), 'utf8'));
    if (!/^experimind_pilot_restore_\d+$/.test(saved.targetName) || resolve(saved.restoredRoot) !== join(existingBase, 'restored-objects')) throw Error('Unexpected recovery targets');
    if (hash(await readFile(join(existingBase, 'backup', 'database.dump'))) !== saved.dumpDigest) throw Error('Backup dump changed');
    const recoveredUrl = new URL(sourceUrl); recoveredUrl.pathname = `/${saved.targetName}`;
    restored = new pg.Client({ connectionString: recoveredUrl.href }); await restored.connect();
    const restoredTables = (await restored.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    const objects = await tree(saved.restoredRoot);
    if (JSON.stringify(saved.tables) !== JSON.stringify(await snapshot(restored, restoredTables)) || JSON.stringify(saved.objects) !== JSON.stringify(objects)) throw Error('Saved manifest differs from restored data');
    const sql = await run('pg_dump', ['--schema-only', '--no-owner', '--no-privileges', `--dbname=${saved.targetName}`]);
    if (hash(normalizeSchema(sql)) !== saved.schemaDigest) throw Error('Restored schema differs from manifest');
    console.log(JSON.stringify({ status: 'PASS', targetName: saved.targetName, integrity: await verify(restored, objects), validation: 'retained pair; read only' }));
  } else {
  await source.connect();
  // An administrator is used only for CREATE DATABASE, with explicit local
  // credentials supplied by the operator. Never guess or elevate the app role.
  let creationEnv = privateEnv;
  if (process.env.RECOVERY_ADMIN_DATABASE_URL) {
    const admin = new URL(process.env.RECOVERY_ADMIN_DATABASE_URL);
    if (admin.hostname !== '127.0.0.1' || admin.port !== '55432' || admin.pathname !== '/postgres' || admin.username !== 'postgres' || admin.search || admin.hash) throw Error('Refusing non-isolated recovery administrator');
    creationEnv = { ...privateEnv, PGUSER: 'postgres', PGPASSWORD: decodeURIComponent(admin.password), PGDATABASE: 'postgres' };
  } else {
    const role = (await source.query('SELECT rolcreatedb,rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0];
    if (!role.rolcreatedb && !role.rolsuper) throw Error('Recovery requires operator-approved local administrator credentials in RECOVERY_ADMIN_DATABASE_URL; do not grant CREATEDB to the application role');
  }
  const server = (await source.query('SELECT version() version,current_database() database')).rows[0];
  if (!server.version.startsWith('PostgreSQL 17.')) throw Error('Unexpected server major');
  const active = (await source.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'")).rows[0].n;
  if (active) throw Error('Stop all application/test clients before paired backup');
  const tables = (await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  await mkdir(base, { recursive: true }); await mkdir(backupRoot); await mkdir(restoredRoot);
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  await source.query("SET LOCAL lock_timeout='5s'");
  await source.query(`LOCK TABLE ${tables.map(t => `public.${quote(t.tablename)}`).join(',')} IN SHARE MODE`);
  const snapshotId = (await source.query('SELECT pg_export_snapshot() id')).rows[0].id;
  const sourceData = await snapshot(source, tables);
  const objects = await tree(objectRoot, join(backupRoot, 'objects'));
  const integrity = await verify(source, objects);
  const dump = join(backupRoot, 'database.dump');
  await run('pg_dump', ['--format=custom', '--no-owner', '--no-privileges', `--snapshot=${snapshotId}`, `--file=${dump}`]);
  const schemaArgs = ['--schema-only', '--no-owner', '--no-privileges'];
  const schema = normalizeSchema(await run('pg_dump', schemaArgs));
  const manifest = { server, versions, git: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), stamp, sourceDatabase: server.database, targetName, sourceObjectRoot: objectRoot, restoredRoot, dumpDigest: hash(await readFile(dump)), schemaDigest: hash(schema), tables: sourceData, objects, integrity };
  await writeFile(join(backupRoot, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx', mode: 0o600 });
  await source.query('COMMIT');
  await run('createdb', ['--template=template0', `--owner=${decodeURIComponent(sourceUrl.username)}`, targetName], creationEnv);
  await run('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', `--dbname=${targetName}`, dump]);
  const backupObjects = await tree(join(backupRoot, 'objects'), restoredRoot);
  const restoredObjects = await tree(restoredRoot);
  if (JSON.stringify(objects) !== JSON.stringify(backupObjects) || JSON.stringify(objects) !== JSON.stringify(restoredObjects)) throw Error('Object-tree differences');
  const restoredUrl = new URL(sourceUrl); restoredUrl.pathname = `/${targetName}`;
  restored = new pg.Client({ connectionString: restoredUrl.href }); await restored.connect();
  const restoredTables = (await restored.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
  if (JSON.stringify(tables) !== JSON.stringify(restoredTables) || JSON.stringify(sourceData) !== JSON.stringify(await snapshot(restored, tables))) throw Error('Database/sequence differences');
  const restoredSchema = normalizeSchema(await run('pg_dump', [...schemaArgs, `--dbname=${targetName}`]));
  if (schema !== restoredSchema) throw Error('Schema differences');
  const restoredIntegrity = await verify(restored, restoredObjects);
  if (JSON.stringify(sourceData) !== JSON.stringify(await snapshot(source, tables)) || JSON.stringify(objects) !== JSON.stringify(await tree(objectRoot))) throw Error('Source changed during rehearsal');
  await run('psql', [`--dbname=${targetName}`, '--no-psqlrc', '--set=ON_ERROR_STOP=1', '--command=SELECT current_database(), count(*) AS applied_migrations FROM migrations;']);
  const result = { status: 'PASS', base, targetName, restoredRoot, tables: tables.length, integrity: restoredIntegrity, completedAt: new Date().toISOString() };
  await writeFile(join(base, 'result.json'), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result));
  }
} catch (error) {
  console.error('FAIL. Preserve all targets for diagnosis; source was not overwritten.');
  throw error;
} finally { if (restored) await restored.end(); await source.end(); }
