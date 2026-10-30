/** Disposable browser scope. Never run against an operational database. */
import 'reflect-metadata';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { configureDatabaseBoundary } from '../src/security/databaseBoundary.ts';

const url = new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL ?? '');
if (['.local-dev/d6f-app.env', '.local-dev/d6f-accounts.json', '.local-dev/d6f-evidence.json'].some(existsSync)) {
  throw new Error('Existing browser scope must be preserved; use its private configuration');
}
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_test') {
  throw new Error('Only the isolated loopback test database is permitted');
}
const evidence = JSON.parse(readFileSync('.local-dev/d6f-source-evidence.json', 'utf8'));
const source: string = evidence.schema;
if (!/^requirement_test_[a-f0-9]{32}$/.test(source)) throw new Error('Synthetic source schema required');
const schema = `requirement_test_${randomUUID().replaceAll('-', '')}`;
const bin = resolve('.local-dev/tools/postgresql-17.5/pgsql/bin');
const pgEnv = { ...process.env, PGHOST: url.hostname, PGPORT: url.port, PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: url.pathname.slice(1) };
const dump = execFileSync(join(bin, 'pg_dump.exe'), ['--schema', source, '--no-owner', '--no-privileges'],
  { env: pgEnv, windowsHide: true, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
const dumpPath = resolve(`.local-dev/d6f-${schema}.sql`);
writeFileSync(dumpPath, dump.replaceAll(source, schema), { flag: 'wx' });
execFileSync(join(bin, 'psql.exe'), ['-X', '--single-transaction', '-v', 'ON_ERROR_STOP=1', '-q', '-f', dumpPath],
  { env: pgEnv, windowsHide: true, stdio: 'pipe' });
const owner = new DataSource({ type: 'postgres', url: url.toString(), schema,
  extra: { options: `-c search_path=pg_catalog,${schema},pg_temp` } });
await owner.initialize();
try {
  const suffix = randomBytes(6).toString('hex');
  const roles = { runtime: `d6fr_${suffix}`, identity: `d6fi_${suffix}`, ledger: `d6fl_${suffix}` };
  const lines = [`DATABASE_SCHEMA=${schema}`];
  for (const [kind, role] of Object.entries(roles)) {
    const password = randomBytes(32).toString('hex');
    await owner.query(`CREATE ROLE "${role}" LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    const connection = new URL(url); connection.username = role; connection.password = password;
    lines.push(`${kind === 'runtime' ? 'DATABASE_URL' : kind === 'identity' ? 'IDENTITY_DATABASE_URL' : 'RECEIPT_LEDGER_DATABASE_URL'}=${connection}`);
  }
  await owner.transaction(manager => configureDatabaseBoundary(manager, schema, roles));
  const orgs = await owner.query("SELECT organization_id FROM users WHERE lower(email) IN ('approver@test.invalid','other@test.invalid') ORDER BY CASE WHEN lower(email)='approver@test.invalid' THEN 0 ELSE 1 END");
  if (orgs.length < 2) throw new Error('Two synthetic tenants required');
  const password = randomBytes(24).toString('base64url');
  const hash = await bcrypt.hash(password, 12);
  const accounts = [];
  for (const [name, role, organization] of [['admin', 'admin', orgs[0].organization_id], ['viewer', 'viewer', orgs[0].organization_id], ['other', 'admin', orgs[1].organization_id]]) {
    const email = `d6f-${name}-${suffix}@test.invalid`;
    const [account] = await owner.query('INSERT INTO users(email,name,role,organization_id,password_hash,is_active) VALUES($1,$2,$3,$4,$5,true) RETURNING id,email,role,organization_id',
      [email, `SYNTHETIC D6-F ${name}`, role, organization, hash]);
    accounts.push({ ...account, password });
  }
  lines.push(`MIGRATION_DATABASE_URL=${url}`, 'NODE_ENV=production', 'HOST=127.0.0.1', 'PORT=3104', 'ALLOW_GUEST=false',
    `JWT_SECRET=${randomBytes(32).toString('hex')}`, 'JWT_EXPIRES_IN=2h', 'VITE_TRUSTED_PRODUCTION_ENABLED=true',
    'VITE_TRUSTED_PACKING_ENABLED=true', 'VITE_TRUSTED_DELIVERY_ENABLED=true', 'APP_URL=http://127.0.0.1:3104', 'BACKUP_RETENTION_DAYS=14');
  writeFileSync('.local-dev/d6f-app.env', lines.join('\n') + '\n', { flag: 'wx' });
  writeFileSync('.local-dev/d6f-accounts.json', JSON.stringify(accounts, null, 2), { flag: 'wx' });
  writeFileSync('.local-dev/d6f-evidence.json', JSON.stringify({ ...evidence, schema, source, roles, accounts: accounts.map(({ password: _password, ...account }) => account) }, null, 2), { flag: 'wx' });
  console.log(`Prepared isolated synthetic browser schema ${schema}; fresh accounts and configuration saved privately.`);
} finally { await owner.destroy(); }
