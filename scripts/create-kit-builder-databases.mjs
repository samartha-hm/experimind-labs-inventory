import pg from 'pg';
const url = new URL(process.env.DATABASE_URL ?? '');
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_development') throw new Error('Refusing non-development connection');
url.pathname = '/postgres';
const client = new pg.Client({ connectionString: url.href });
await client.connect();
try {
  for (const name of ['experimind_kitbuilder_development', 'experimind_kitbuilder_test']) {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    // Fixed internal names, never client input.
    if (!exists.rowCount) await client.query(`CREATE DATABASE "${name}"`);
  }
} finally { await client.end(); }
