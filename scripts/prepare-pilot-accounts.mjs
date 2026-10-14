// Add synthetic acceptance identities only; never reset existing users or stock.
import pg from 'pg';
import bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const url = new URL(process.env.DATABASE_URL ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_development') throw Error('Refusing non-isolated database');
const client = new pg.Client({ connectionString: url.href });
await client.connect();
const accounts = [];
try {
  await client.query('BEGIN');
  const orgs = (await client.query('SELECT id,name FROM organizations WHERE name = ANY($1)', [['Kit Builder Development', 'Kit Builder Other Tenant']])).rows;
  if (orgs.length !== 2) throw Error('Expected synthetic organizations missing or ambiguous');
  for (const [label, role, orgName] of [
    ['admin', 'admin', 'Kit Builder Development'], ['staff', 'staff', 'Kit Builder Development'],
    ['viewer', 'viewer', 'Kit Builder Development'], ['other-admin', 'admin', 'Kit Builder Other Tenant'],
  ]) {
    const email = `pilot-${label}@kitbuilder.test`;
    if ((await client.query('SELECT 1 FROM users WHERE email=$1', [email])).rowCount) throw Error('Pilot identities already exist; use the saved credentials, do not reset');
    const password = randomBytes(24).toString('base64url');
    await client.query('INSERT INTO users(id,organization_id,email,name,role,password_hash) VALUES($1,$2,$3,$4,$5,$6)',
      [randomUUID(), orgs.find(o => o.name === orgName).id, email, `Synthetic Pilot ${label}`, role, await bcrypt.hash(password, 12)]);
    accounts.push({ email, password, role, organization: orgName });
  }
  await mkdir('.local-dev', { recursive: true });
  // Exclusive write before commit: no silent credential-file overwrite.
  await writeFile('.local-dev/pilot-accounts.json', JSON.stringify(accounts, null, 2), { flag: 'wx', mode: 0o600 });
  await client.query('COMMIT');
  console.log('Four synthetic identities created. Credentials: .local-dev/pilot-accounts.json (private; do not share).');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
