import 'reflect-metadata';
import { DataSource, MigrationExecutor } from 'typeorm';
import pg from 'pg';
import { AppDataSource, databaseSchema } from '../src/db.ts';
import { inspectMigrationPlan, inspectMigrationAuthority } from './ops/migration-integrity.mjs';

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length && !['--plan', '--apply'].includes(args[0]))) throw new Error('invalid-options');
  const connectionString = process.env.MIGRATION_DATABASE_URL;
  if (!connectionString) throw new Error('missing-migration-configuration');
  const target = new URL(connectionString);
  const accounts = new Set([decodeURIComponent(target.username)]);
  for (const key of ['DATABASE_URL', 'IDENTITY_DATABASE_URL', 'RECEIPT_LEDGER_DATABASE_URL']) {
    if (!process.env[key]) throw new Error('role-separation-required');
    const other = new URL(process.env[key]!);
    if (accounts.has(decodeURIComponent(other.username)) ||
        other.hostname !== target.hostname || (other.port || '5432') !== (target.port || '5432') || other.pathname !== target.pathname)
      throw new Error('role-separation-required');
    accounts.add(decodeURIComponent(other.username));
  }
  const ssl = ['localhost', '127.0.0.1'].includes(target.hostname) ? false : { rejectUnauthorized: true };
  const client = new pg.Client({ connectionString, ssl, connectionTimeoutMillis: 5000, query_timeout: 5000,
    options: `-c default_transaction_read_only=on -c search_path=${databaseSchema},pg_catalog -c statement_timeout=5000` });
  client.on('error', () => {});
  let ready = false;
  try {
    await client.connect();
    const plan = await inspectMigrationPlan(client.query.bind(client), databaseSchema);
    const authority = await inspectMigrationAuthority(client.query.bind(client), databaseSchema);
    ready = plan.ready && authority;
    console.log(JSON.stringify({ ...plan, ready, authority, mode: 'READ_ONLY_PLAN' }, null, 2));
  } finally { await client.end(); }
  if (!ready) { process.exitCode = 1; return; }
  if (args[0] !== '--apply') return;

  // This checkpoint authorizes synthetic tests only, never an operational upgrade.
  if (target.hostname !== '127.0.0.1' || !['55432', '55433'].includes(target.port) ||
      target.pathname !== '/experimind_kitbuilder_test' || !/^requirement_test_[a-f0-9]{32}$/.test(databaseSchema))
    throw new Error('isolated-target-required');
  const db = new DataSource({ ...AppDataSource.options as Extract<import('typeorm').DataSourceOptions, { type: 'postgres' }>,
    url: connectionString, ssl, logging: false, synchronize: false, migrationsRun: false, installExtensions: false,
    extra: { max: 1, connectionTimeoutMillis: 5000, options: `-c search_path=${databaseSchema},pg_catalog -c lock_timeout=5000` } });
  try {
    await db.initialize();
    const runner = db.createQueryRunner();
    try {
      await runner.startTransaction('READ COMMITTED');
      await runner.query('SELECT pg_advisory_xact_lock(hashtext(current_database()),hashtext($1))', [databaseSchema]);
      const query = async (sql: string, params?: unknown[]) => ({ rows: await runner.query(sql, params) });
      const plan = await inspectMigrationPlan(query, databaseSchema);
      if (!plan.ready || !await inspectMigrationAuthority(query, databaseSchema)) throw new Error('migration-integrity-blocked');
      const executor = new MigrationExecutor(db, runner);
      executor.transaction = 'all';
      const executed = await executor.executePendingMigrations();
      await runner.commitTransaction();
      console.log(JSON.stringify({ executed: executed.map(migration => migration.name) }));
    } catch (error) { if (runner.isTransactionActive) await runner.rollbackTransaction(); throw error; }
    finally { await runner.release(); }
  } finally { if (db.isInitialized) await db.destroy(); }
}

main().catch(() => {
  console.error('Migration refused or failed; inspect manifest, journal, isolated target and distinct role configuration locally. Connection details suppressed.');
  process.exitCode = 1;
});
