import pg from 'pg';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { replayCommitments, planningUnits } from '../src/services/CommitmentLedgerService.ts';
const milestone = process.env.COMMITMENT_RECOVERY_MILESTONE ?? '13md1r';
if (!['13md1r','13md1t','13md1u','13md1v','13md1w','13md2a','13md2b1','13md2b2a'].includes(milestone)) throw Error('Unsupported recovery milestone');
const evidence = JSON.parse(await readFile(`.local-dev/${milestone}-evidence.json`, 'utf8'));
const schema = evidence.schema;
const url = new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '55432' || url.pathname !== '/experimind_kitbuilder_test' || !/^requirement_test_[a-f0-9]{32}$/.test(schema)) throw Error('Isolated synthetic database/schema required');
const target = `commitment_restore_${randomUUID().replaceAll('-', '')}`;
const directory = resolve(`.local-dev/${milestone}-recovery`, target);
await mkdir(directory, {recursive:true});
const tools = resolve('.local-dev/tools/postgresql-17.5/pgsql/bin');
const env = {...process.env, PGHOST:url.hostname, PGPORT:url.port, PGUSER:decodeURIComponent(url.username), PGPASSWORD:decodeURIComponent(url.password), PGDATABASE:url.pathname.slice(1)};
const run = (name, args, overrides = {}) => execFileSync(join(tools, `${name}.exe`), args, {env:{...env,...overrides},windowsHide:true,encoding:'utf8',maxBuffer:32*1024*1024});
const dump = run('pg_dump', ['--schema',schema,'--no-owner','--no-privileges']);
const path = join(directory,'synthetic.sql');
await writeFile(path,dump.replaceAll(schema,target));
run('psql',['-X','--single-transaction','--set','ON_ERROR_STOP=1','--quiet','--file',path],{PGOPTIONS:`-c search_path=${target},public`});
const client = new pg.Client({connectionString:url.toString()}); await client.connect();
try {
 const po=milestone==='13md2b2a',pr=po||milestone==='13md2b1',d2=pr||milestone==='13md2a';
 const tables=['accounts','entitlements','balances','claims','sources','events','reconciliation_cases',...(['13md1v','13md1w','13md2a','13md2b1','13md2b2a'].includes(milestone)?['authorizations']:[]),...(d2?['reservations']:[]),...(pr?['pr_lines']:[]),...(po?['po_lines','po_coverage']:[])];
 const operational=d2?['project_stock_reservations','supply_events','requirement_execution_bindings',...(pr?['purchase_requests']:[]),...(po?['purchase_orders']:[])]:[];
 const fingerprints=async namespace=>{
  const result={};
  for(const t of [...tables.map(t=>`commitment_${t}`),...operational]) {
   const {rows}=await client.query(`SELECT count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${namespace}.${t} t`);
   result[t.replace(/^commitment_/,'')]=rows[0];
  }
  return result;
 };
 const before=await fingerprints(schema),after=await fingerprints(target);
 if(!before.events.count || JSON.stringify(before)!==JSON.stringify(after)) throw Error('Nonempty ledger restore fingerprint mismatch');
 const {rows:functions}=await client.query(`SELECT p.proname,p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname=$1 AND p.proname LIKE 'commitment_%'`,[target]);
 if(functions.length!==(po?15:pr?13:d2?11:8) || functions.some(f=>!f.proconfig?.includes(`search_path=pg_catalog, ${target}, pg_temp`))) throw Error('Restored ledger function path mismatch');
 const {rows:witness}=await client.query(`SELECT t.tgenabled,t.tgdeferrable,t.tginitdeferred FROM pg_trigger t
  JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname=$1 AND c.relname='commitment_balances' AND t.tgname='commitment_event_witness'`,[target]);
 if(witness.length!==1 || witness[0].tgenabled!=='O' || !witness[0].tgdeferrable || !witness[0].tginitdeferred) throw Error('Restored witness configuration mismatch');
 const {rows:balances}=await client.query(`SELECT * FROM ${target}.commitment_balances ORDER BY account_id`);
 for(const b of balances) {
  const {rows:events}=await client.query(`SELECT * FROM ${target}.commitment_events WHERE account_id=$1 ORDER BY sequence`,[b.account_id]);
  const {rows:entitlements}=await client.query(`SELECT * FROM ${target}.commitment_entitlements WHERE account_id=$1`,[b.account_id]);
  const replay=replayCommitments(events,entitlements);
  if(replay.approved!==planningUnits(b.approved)||replay.fulfilled!==planningUnits(b.fulfilled)||replay.held!==planningUnits(b.held)) throw Error('Restored replay mismatch');
 }
 const diagnostics=evidence.commitment_shadow.diagnostics;
 const grouped={}; for(const d of diagnostics) {const key=`${d.kind}:${d.code}`;grouped[key]=(grouped[key]??0)+1;}
 const shadowRecords=[];
 for(const table of ['project_stock_reservations','purchase_requests','production_work_orders','packing_orders','delivery_orders']) {
  const {rows}=await client.query(`SELECT id,to_jsonb(t)->>'status' status,to_jsonb(t)->>'state' state,
   to_jsonb(t)->>'project_id' project_id,to_jsonb(t)->>'site_id' site_id FROM ${schema}.${table} t ORDER BY id`);
  shadowRecords.push(...rows.filter(r=>diagnostics.some(d=>d.kind===table&&d.source===r.id)).map(r=>({kind:table,...r})));
 }
 const {rows:roles}=await client.query('SELECT current_user,rolsuper,rolcreaterole FROM pg_roles WHERE rolname=current_user');
 if(d2) {
  const {rows}=await client.query(`SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND t.tgname='commitment_reservation_witness'
    AND t.tgenabled='O' AND t.tgdeferrable AND t.tginitdeferred`,[target]);
  if(rows[0].n!==3) throw Error('Restored reservation witnesses mismatch');
 }
 if(pr) {
  const {rows}=await client.query(`SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND t.tgname='commitment_pr_witness'
   AND t.tgenabled='O' AND t.tgdeferrable AND t.tginitdeferred`,[target]);
  if(rows[0].n!==3) throw Error('Restored PR witnesses mismatch');
  const {rows:gates}=await client.query(`SELECT t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname='purchase_goods_receipts'
   AND t.tgname='a_d2_pr_receipt_gate'`,[target]);
  if(gates.length!==1 || gates[0].tgenabled!=='O') throw Error('Restored PR receipt gate mismatch');
  await client.query(`SELECT ${target}.commitment_pr_check(request_id) FROM ${target}.commitment_pr_lines`);
 }
 if(po) {
  const {rows}=await client.query(`SELECT count(*)::int n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
   JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND t.tgname='commitment_po_witness'
   AND t.tgenabled='O' AND t.tgdeferrable AND t.tginitdeferred`,[target]);
  if(rows[0].n!==3 || !before.po_coverage.count) throw Error('Restored nonempty PO witnesses mismatch');
  await client.query(`SELECT ${target}.commitment_po_check(order_id) FROM ${target}.commitment_po_lines`);
 }
 const output={source_schema:schema,target_schema:target,all_table_fingerprints_match:true,verified_table_count:tables.length+operational.length,pinned_functions:functions.length,deferred_witness_restored:true,replayed_accounts:balances.length,before,after,backup_restore:'PASS',migration_role:roles[0],shadow:grouped,shadow_records:shadowRecords};
 await writeFile(`.local-dev/${milestone}-recovery-evidence.json`,JSON.stringify(output,null,2));
 console.log(JSON.stringify({backup_restore:output.backup_restore,replayed_accounts:output.replayed_accounts,events:before.events.count,pinned_functions:output.pinned_functions}));
} finally {await client.end();}
