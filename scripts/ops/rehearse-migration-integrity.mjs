import pg from 'pg';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { inspectMigrationPlan } from './migration-integrity.mjs';

// A refusal/recovery rehearsal, never a substitute for an approved historical upgrade.
const source = JSON.parse(await readFile('.local-dev/d6m-evidence.json', 'utf8')).schema;
const url = new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL);
if (url.hostname !== '127.0.0.1' || !['55432','55433'].includes(url.port) ||
    url.pathname !== '/experimind_kitbuilder_test' || !/^requirement_test_[a-f0-9]{32}$/.test(source))
  throw Error('Isolated synthetic source required');
const target = `requirement_test_${randomUUID().replaceAll('-', '')}`;
const directory = resolve('.local-dev/d6m-recovery');
await mkdir(directory, { recursive: true });
const environment = { ...process.env, PGHOST: url.hostname, PGPORT: url.port,
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) };
const run = (name, args) => execFileSync(resolve('.local-dev/tools/postgresql-17.5/pgsql/bin', `${name}.exe`), args,
  { env: environment, windowsHide: true, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const backup = run('pg_dump', ['--schema', source, '--no-owner', '--no-privileges']);
await writeFile(join(directory, 'populated-source.sql'), backup);
const restored = join(directory, 'disposable-clone.sql');
await writeFile(restored, backup.replaceAll(source, target));
run('psql', ['-X', '--single-transaction', '--set', 'ON_ERROR_STOP=1', '--quiet', '--file', restored]);
const client = new pg.Client({ connectionString: url.toString() });
await client.connect();
try {
  const tables = (await client.query(`SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename`, [source])).rows.map(r => r.tablename);
  const fingerprint = async schema => {
    const result = {};
    for (const table of tables) result[table] = (await client.query(
      `SELECT count(*)::int count,md5(coalesce(string_agg(replace(row_to_json(t)::text,$1,'__synthetic_schema__'),'' ORDER BY replace(row_to_json(t)::text,$1,'__synthetic_schema__')),'')) hash FROM "${schema}"."${table}" t`, [schema])).rows[0];
    return result;
  };
  const before = await fingerprint(source);
  assert(before.stock_ledger.count > 0 && before.commitment_events.count > 0 && before.audit_logs.count > 0);
  assert.deepEqual(await fingerprint(target), before);
  await client.query('BEGIN READ ONLY');
  const plan = await inspectMigrationPlan(client.query.bind(client), target);
  assert.equal(plan.ready, false);
  assert(plan.issues.includes('duplicate-timestamp') && plan.issues.includes('journal-unverified'));
  await client.query('COMMIT');
  // Corrupt metadata exists only in a rolled-back disposable-clone transaction.
  await client.query('BEGIN');
  await client.query(`CREATE TABLE "${target}".migrations(id serial PRIMARY KEY,timestamp bigint NOT NULL,name varchar NOT NULL)`);
  await client.query(`INSERT INTO "${target}".migrations(timestamp,name) VALUES(1700000000001,'Unknown1700000000001')`);
  const corrupt = await inspectMigrationPlan(client.query.bind(client), target);
  assert(corrupt.issues.includes('unknown-applied'));
  await client.query('ROLLBACK');
  const retry = await inspectMigrationPlan(client.query.bind(client), target);
  assert.deepEqual(retry.issues, plan.issues);
  assert.equal((await client.query('SELECT to_regclass($1) relation', [`${target}.migrations`])).rows[0].relation, null);
  assert.deepEqual(await fingerprint(target), before);
  const definition = (await client.query(`SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname=$1 AND p.proname='requirement_d4_project_blocked'`, [target])).rows[0].definition;
  assert(/LEFT JOIN commitment_balances/.test(definition) && /commitment_claims/.test(definition) && /a.dimension='slot'/.test(definition));
  const evidence = { source_schema: source, clone_schema: target, backup_sha256: createHash('sha256').update(backup).digest('hex'),
    table_count: tables.length, fingerprints: before, clone_hashes_match: true, read_only_plan: plan.issues,
    applied: plan.applied, pending: plan.pending, unknown_history_refused: true, interrupted_metadata_rolled_back: true,
    retry_preserves_absent_journal: true, closure_guard_32_retained: true,
    successful_registry_upgrade: false, verdict: 'BLOCKED', limitation: 'Synchronized baseline has no genuine applied journal; no approved full-chain execution or fresh-install equivalence.' };
  await writeFile(join(directory, 'evidence.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify({ clone_hashes_match: true, tables: tables.length, issues: plan.issues, verdict: evidence.verdict }));
} finally { await client.end(); }
