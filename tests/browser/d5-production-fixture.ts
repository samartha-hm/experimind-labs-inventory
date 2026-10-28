import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AppDataSource } from '../../src/db';
import { InventoryItem } from '../../src/entity/InventoryItem';
import { TrustedLedgerAuthority, type LedgerRequest } from '../../src/security/TrustedLedgerAuthority';
import { env } from '../../src/config/env';

// Explicit synthetic catalog/publication fixtures. Stock and execution use supported HTTP controls.
async function main() {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const schema = process.env.DATABASE_SCHEMA!;
  const url = new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL!);
  if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_test'
    || !/^requirement_test_[a-f0-9]{32}$/.test(schema)) throw Error('Isolated synthetic database required');
  const options = AppDataSource.options as Extract<DataSourceOptions, { type: 'postgres' }>;
  const db = await new DataSource({ ...options, url: input.mode === 'item' ? url.toString() : process.env.RECEIPT_LEDGER_DATABASE_URL,
    schema, synchronize: false, migrationsRun: false, logging: false,
    extra: { options: `-c search_path=pg_catalog,${schema},pg_temp` } }).initialize();
  try {
    if (input.mode === 'item') {
      const account = JSON.parse(readFileSync(process.env.D5_BROWSER_ACCOUNT ?? '.local-dev/d50-browser-account.json', 'utf8'));
      const item = await db.getRepository(InventoryItem).save({ organization_id: account.organization_id,
        name: `SIMULATED D5 finished ${randomUUID()}`, sku: randomUUID(), unit: 'pcs', quantity: 0, threshold: 0, base_price: 0 });
      process.stdout.write(JSON.stringify({ id: item.id }));
    } else {
      const authority = await TrustedLedgerAuthority.create(db, env.jwtSecret, schema);
      const operation = input.operation as LedgerRequest;
      const capability = await authority.issue(input.token, operation);
      const path = operation.action === 'publishRecipe' ? 'recipe-versions' : 'work-order-claims';
      const response = await fetch(`http://127.0.0.1:3006/api/v1/production-planning/${path}`, { method: 'POST',
        headers: { Authorization: `Bearer ${input.token}`, 'Content-Type': 'application/json',
          'Idempotency-Key': operation.key, 'X-Ledger-Capability': capability }, body: JSON.stringify(operation.input) });
      const body = await response.json();
      if (!response.ok) throw Error(`Fixture ${operation.action}: ${response.status} ${JSON.stringify(body)}`);
      process.stdout.write(JSON.stringify(body));
    }
  } finally { await db.destroy(); }
}
main().catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
