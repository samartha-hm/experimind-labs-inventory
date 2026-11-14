/** Fixture prerequisites only: publication, raw opening and exclusive work-order claim. */
import 'reflect-metadata';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { AppDataSource } from '../src/db.ts';
import { InventoryItem } from '../src/entity/InventoryItem.ts';
import { StocktakeService } from '../src/services/StocktakeService.ts';
import { TrustedLedgerAuthority, type LedgerRequest } from '../src/security/TrustedLedgerAuthority.ts';

if (existsSync('.local-dev/d6f-production-prerequisites.json')) throw Error('Existing prerequisites must be preserved');
const scope = JSON.parse(readFileSync('.local-dev/d6f-evidence.json', 'utf8'));
const account = JSON.parse(readFileSync('.local-dev/d6f-accounts.json', 'utf8'))[0];
const approvalId = process.env.D6F_BROWSER_APPROVAL;
if (!approvalId || !/^[a-f0-9-]{36}$/.test(approvalId)) throw Error('D6F_BROWSER_APPROVAL must identify the browser-created synthetic approval');
const url = new URL(process.env.MIGRATION_DATABASE_URL!);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_test'
  || process.env.DATABASE_SCHEMA !== scope.schema || !/^requirement_test_[a-f0-9]{32}$/.test(scope.schema)) throw Error('Isolated scope required');
const options = AppDataSource.options as Extract<DataSourceOptions, { type: 'postgres' }>;
const connect = (connection: string) => new DataSource({ ...options, url: connection, schema: scope.schema,
  synchronize: false, migrationsRun: false, logging: false, extra: { options: `-c search_path=pg_catalog,${scope.schema},pg_temp` } }).initialize();
const owner = await connect(url.toString());
const ledger = await connect(process.env.RECEIPT_LEDGER_DATABASE_URL!);
try {
  const [approval] = await owner.query('SELECT * FROM requirement_approvals WHERE id=$1 AND organization_id=$2', [approvalId, account.organization_id]);
  if (!approval) throw Error('Browser-created approval required');
  const [site] = await owner.query('SELECT id FROM planning_sites WHERE project_id=$1', [approval.project_id]);
  const material = approval.snapshot.materials[0];
  const quantity = String(material.gross_demand);
  const response = await fetch('http://127.0.0.1:3104/api/v1/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password: account.password }) });
  if (!response.ok) throw Error(`Synthetic login failed: ${response.status}`);
  const { token } = await response.json();
  const authority = await TrustedLedgerAuthority.create(ledger, process.env.JWT_SECRET!, scope.schema);
  const perform = async (request: LedgerRequest) => authority.performForSession(token, await authority.issue(token, request), request);
  const raw = await owner.getRepository(InventoryItem).save({ organization_id: account.organization_id, name: 'SYNTHETIC D6-F raw input', unit: 'g', sku: randomUUID(), base_price: 0, quantity: 0, threshold: 0 });
  const stocktake = new StocktakeService(owner);
  let count = await stocktake.create(account.organization_id, account.id, 'SYNTHETIC D6-F opening', 'No real goods', [{ item_id: raw.id, locations: ['D6-F synthetic raw shelf'], complete_coverage: true }]);
  count = await stocktake.count(account.organization_id, count.id, account.id, count.revision, raw.id, 'D6-F synthetic raw shelf', quantity, 'g');
  for (const action of ['review', 'approve', 'post'] as const) count = await stocktake.transition(account.organization_id, count.id, account.id, count.revision, action, 'SYNTHETIC TEST EVIDENCE');
  const recipe = await perform({ action: 'publishRecipe', key: randomUUID(), input: { name: 'SYNTHETIC D6-F recipe', definition: { output_item_id: material.inventory_item_id, unit: 'm', yield_quantity: '1', instructions: 'Synthetic', specification: 'Synthetic', concentration: '', inputs: [{ item_id: raw.id, quantity: '1', canonical_quantity: '1', unit: 'g', scrap_percent: '0' }] } } });
  const order = await perform({ action: 'claimWorkOrder', key: randomUUID(), input: { project: approval.project_id, site: site.id, approval: approval.id, demandRevision: approval.revision, recipe: recipe.id as string, quantity, unit: 'm', source: randomUUID() } });
  writeFileSync('.local-dev/d6f-production-prerequisites.json', JSON.stringify({ classification: 'FIXTURE ONLY, SYNTHETIC', project: approval.project_id, site: site.id, approval: approval.id, raw: raw.id, quantity, recipe, order }, null, 2), { flag: 'wx' });
  console.log('Synthetic recipe, verified raw opening and exclusive claim prepared; no issue, output or packing fixture actions.');
} finally { await ledger.destroy(); await owner.destroy(); }
