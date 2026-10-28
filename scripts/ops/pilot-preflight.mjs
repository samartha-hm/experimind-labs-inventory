import { stat, statfs, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import pg from 'pg';

/** No secret values, URLs, role names or database errors enter the report. */
export function configurationChecks(env, nodeVersion = process.versions.node) {
  const checks = [];
  const check = (id, ok, action) => checks.push({id, status: ok ? 'PASS' : 'BLOCKED', action});
  check('node', Number(nodeVersion.split('.')[0]) >= 22, 'Use the verified Node 22+ runtime and locked dependencies.');
  check('production-mode', env.NODE_ENV === 'production', 'Validate a separately supplied production configuration; do not change the running service.');
  check('jwt-secret', Boolean(env.JWT_SECRET && env.JWT_SECRET.length >= 32 && !/super-secret|changeme|example/i.test(env.JWT_SECRET)), 'Supply a non-default secret through approved provisioning. Values are never printed.');
  check('guest-disabled', env.ALLOW_GUEST !== 'true', 'Guest access must remain disabled.');
  const connections = new Map();
  for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'IDENTITY_DATABASE_URL', 'RECEIPT_LEDGER_DATABASE_URL']) {
    try {
      const url = new URL(env[key]);
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.username || !url.password || url.pathname === '/') throw new Error();
      connections.set(key, url);
      check(key, true, 'Configured; connectivity and permissions require read-only database inspection.');
    } catch { check(key, false, 'Supply a valid, distinct PostgreSQL role connection without exposing its value.'); }
  }
  const runtime = connections.get('DATABASE_URL');
  check('role-separation', connections.size === 4 && new Set([...connections.values()].map(url => decodeURIComponent(url.username))).size === 4,
    'Runtime, migration, identity and receipt writer must use distinct roles.');
  check('same-database', connections.size === 4 && [...connections.values()].every(url => url.hostname === runtime.hostname && (url.port || '5432') === (runtime.port || '5432') && url.pathname === runtime.pathname),
    'All application roles must address the same database.');
  check('local-database', Boolean(runtime && ['localhost', '127.0.0.1', '[::1]'].includes(runtime.hostname)), 'Remote TLS verification is outside this local-first preflight; review separately.');
  check('backup-retention', /^\d+$/.test(env.PILOT_BACKUP_RETENTION_DAYS ?? '') && Number(env.PILOT_BACKUP_RETENTION_DAYS) >= 14,
    'Specify approved backup retention of at least 14 days. No rotation is performed.');
  check('https-origin', (() => { try { const url = new URL(env.APP_URL); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } })(),
    'Supply the approved HTTPS origin; review proxy trust, certificate and LAN firewall rules.');
  return checks;
}

export async function preflight(env = process.env) {
  const checks = configurationChecks(env);
  let appliedMigrations;
  const add = (id, status, action) => checks.push({id, status, action});
  for (const [id, path] of [['server-build', resolve('dist/server.cjs')], ['client-build', resolve('dist/index.html')], ['backup-destination', env.PILOT_BACKUP_DIRECTORY]]) {
    try {
      if (!path) throw new Error();
      const info = await stat(path);
      if (id === 'backup-destination' ? !info.isDirectory() : !info.isFile()) throw new Error();
      add(id, 'PASS', 'Exists; filesystem ACLs, free space and artifact freshness require separate review.');
    } catch { add(id, 'BLOCKED', 'Required artifact or destination is absent. No directories or files were created.'); }
  }
  try {
    const disk = await statfs(env.PILOT_BACKUP_DIRECTORY || process.cwd());
    const available = Number(disk.bavail) * Number(disk.bsize);
    add('disk-space', available >= 10 * 1024 ** 3 ? 'PASS' : 'BLOCKED', 'Require at least 10 GiB free and capacity for database/private files plus retention; measure workload separately.');
  } catch { add('disk-space', 'BLOCKED', 'Unable to inspect storage capacity.'); }
  // Connections are explicit opt-in, read-only and bounded. No migrations, restarts or backup writes.
  if (env.PILOT_PREFLIGHT_CONNECT === 'true') {
    for (const key of ['DATABASE_URL', 'MIGRATION_DATABASE_URL', 'IDENTITY_DATABASE_URL', 'RECEIPT_LEDGER_DATABASE_URL']) {
      if (!checks.find(check => check.id === key && check.status === 'PASS')) continue;
      const parsed = new URL(env[key]);
      if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)) { add(`${key}-connect`, 'BLOCKED', 'Only local PostgreSQL inspection is supported.'); continue; }
      const schema = env.DATABASE_SCHEMA || 'public';
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) { add(`${key}-connect`, 'BLOCKED', 'Supply a valid database schema identifier.'); continue; }
      const client = new pg.Client({connectionString: env[key], connectionTimeoutMillis: 3000, query_timeout: 3000,
        options: `-c default_transaction_read_only=on -c statement_timeout=3000 -c search_path=${schema}`});
      client.on('error', () => {});
      try {
        await client.connect();
        const {rows: [role]} = await client.query(`SELECT current_setting('server_version_num')::int AS version, rolsuper, rolcreatedb, rolcreaterole, rolbypassrls FROM pg_roles WHERE rolname=current_user`);
        const restricted = role && !role.rolsuper && !role.rolcreatedb && !role.rolcreaterole && !role.rolbypassrls;
        add(`${key}-connect`, restricted && role.version >= 140000 ? 'PASS' : 'BLOCKED', 'Require PostgreSQL 14+ and nonsuperuser roles without CREATEDB, CREATEROLE or BYPASSRLS. Table/function grants still require restricted-role acceptance tests.');
        if (key === 'DATABASE_URL') {
          const journal = await client.query("SELECT to_regclass('migrations') IS NOT NULL present");
          if (journal.rows[0].present) appliedMigrations = (await client.query('SELECT name FROM migrations ORDER BY timestamp,id')).rows.map(row=>row.name);
          const {rows} = await client.query(`SELECT n.nspname, c.relname, has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE') AS writable FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relname IN ('stock_ledger','commitment_events') AND c.relkind='r' AND n.nspname=ANY(current_schemas(false))`);
          add('runtime-ledger-denial', rows.length >= 2 && rows.every(row => !row.writable) ? 'PASS' : 'BLOCKED', 'Runtime must not write immutable stock or commitment ledgers; inspect all trusted grants separately.');
        }
      } catch { add(`${key}-connect`, 'BLOCKED', 'Read-only connection/inspection failed; inspect locally without publishing credentials.'); }
      finally { await client.end().catch(() => {}); }
    }
  } else add('database-inspection', 'BLOCKED', 'Set PILOT_PREFLIGHT_CONNECT=true for bounded local read-only checks. No connectivity was attempted.');
  const migrationPreview = {mode:appliedMigrations?'READ_ONLY_JOURNAL':'SOURCE_ONLY', discovered:[], registered:[], unregistered:[], pending:[], applied:appliedMigrations??[]};
  try {
    const source = await readFile(resolve('src/db.ts'), 'utf8');
    const registry = source.split('migrations: [')[1]?.split('],')[0] ?? '';
    migrationPreview.discovered = (await readdir(resolve('src/migration'))).filter(name=>/^\d+-.+\.ts$/.test(name)).sort();
    for (const name of migrationPreview.discovered) {
      const body = await readFile(resolve('src/migration',name),'utf8');
      const symbol = body.match(/export class (\w+)/)?.[1];
      (symbol && new RegExp(`\\b${symbol}\\b`).test(registry) ? migrationPreview.registered : migrationPreview.unregistered).push(name);
      if (symbol && appliedMigrations && !appliedMigrations.includes(symbol)) migrationPreview.pending.push(symbol);
    }
    add('migration-registration',migrationPreview.unregistered.length ? 'BLOCKED':'PASS','Reconcile unregistered migrations and rehearse the ordered upgrade against an isolated clone before cutover.');
  } catch { add('migration-registration','NOT_VERIFIED','Run from the repository with readable migration sources.'); }
  add('migration-applied-preview',appliedMigrations?(migrationPreview.pending.length?'BLOCKED':'PASS'):'NOT_VERIFIED',
    'Read-only journal comparison; pending migrations require isolated upgrade and recovery rehearsal before cutover. No SQL is applied.');
  for (const [id, action] of [
    ['restore-evidence', 'Require a paired database/private-file restore, authenticated checks and stock/custody/fulfillment reconciliation.'],
    ['service-lifecycle', 'Rehearse startup, shutdown and restart only on a workspace-owned isolated service.'],
    ['network-and-offline', 'Verify HTTPS/LAN ACLs, 25-operator load and offline recovery. PWA cache is not acceptance authority.'],
    ['filesystem-acl','Review database, private attachments, backup and service-account ACLs on the intended host.'],
    ['logging','Verify redaction, rotation, retention and alert delivery on the intended service.'],
    ['feature-flags','Record intended production feature flags and their accountable approver; this tool changes none.'],
    ['rollback','Rehearse compatible artifact rollback or coordinated paired restore with authenticated reconciliation.'],
    ['health-and-pwa','Verify HTTPS health, installed PWA artifact freshness and reconnect behavior on the intended devices.'],
  ]) add(id, 'NOT_VERIFIED', action);
  return {mode: 'READ_ONLY_PREFLIGHT', pilot: 'NO-GO', ready: false, migration_preview:migrationPreview,
    checks:checks.map(check=>({...check,severity:check.status==='PASS'?'INFO':check.id.includes('ledger')||check.id.includes('migration')?'P0':'P1',
      evidence_reference:`preflight:${check.id}`,reproduction:'Run node scripts/ops/pilot-preflight.mjs from the repository with separately provisioned environment variables.'}))};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.slice(2).length) { console.error('No command-line options accepted. This tool cannot apply changes.'); process.exitCode = 2; }
  else {
    try {
      const report = await preflight(); console.log(JSON.stringify(report, null, 2));
      process.exitCode = report.checks.some(check => check.status !== 'PASS') ? 1 : 0;
    } catch {
      console.error('Preflight failed. Inspect configuration locally; no acceptance was granted.');
      process.exitCode = 1;
    }
  }
}
