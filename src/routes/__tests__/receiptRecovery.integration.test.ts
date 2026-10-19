import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { DataSource } from "typeorm";
import { expect, it } from "vitest";
import { AppDataSource } from "../../db";
import { env } from "../../config/env";
import { User } from "../../entity/User";
import { AuthService } from "../../services/AuthService";
import { replayCommitments, planningUnits } from "../../services/CommitmentLedgerService";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { assertDatabaseBoundary, configureDatabaseBoundary, sqlIdentifier } from "../../security/databaseBoundary";
import { withReceiptHttp } from "./receiptHttp.cases";

const phase=process.env.RECEIPT_RECOVERY_PHASE;
it.skipIf(!phase)("restarts restricted authenticated receipt HTTP against a nonempty recovered database",async()=>{
  const evidence=JSON.parse(await readFile(".local-dev/13md2b2bs-evidence.json","utf8"));
  const schema:string=evidence.schema, url=new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL!);
  const database=process.env.RECEIPT_RECOVERY_DATABASE??"experimind_kitbuilder_test";
  if(url.hostname!=="127.0.0.1"||url.port!=="55432"||!/^requirement_test_[a-f0-9]{32}$/.test(schema)
    || !/^(experimind_kitbuilder_test|experimind_receipt_restore_[a-f0-9]{16})$/.test(database))throw Error("Isolated recovery target required");
  url.pathname=`/${database}`;
  const options={...AppDataSource.options as Extract<import("typeorm").DataSourceOptions,{type:"postgres"}>,
    url:url.toString(),schema,synchronize:false,migrationsRun:false,logging:false as const,
    extra:{max:2,options:`-c search_path=pg_catalog,${schema},pg_temp`}};
  const owner=await new DataSource(options).initialize(),pools:DataSource[]=[],suffix=randomBytes(8).toString("hex");
  const roles={runtime:`rrt_${suffix}`,identity:`rid_${suffix}`,ledger:`rlg_${suffix}`};
  const tables=["commitment_accounts","commitment_entitlements","commitment_balances","commitment_claims","commitment_sources",
    "commitment_events","commitment_authorizations","commitment_reservations","commitment_pr_lines","commitment_po_lines",
    "commitment_po_coverage","commitment_receipts","commitment_receipt_decisions","project_stock_reservations","supply_events",
    "requirement_execution_bindings","purchase_requests","purchase_orders","purchase_goods_receipts","stock_ledger","physical_stock_scopes"];
  try {
    await owner.query(`REVOKE CREATE ON DATABASE ${sqlIdentifier(database)} FROM PUBLIC`);
    await owner.query("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    for(const role of Object.values(roles)){
      const password=randomBytes(32).toString("hex");
      await owner.query(`CREATE ROLE ${sqlIdentifier(role)} LOGIN PASSWORD '${password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
      const connection=new URL(url);connection.username=role;connection.password=password;
      pools.push(new DataSource({...options,url:connection.toString()}));
    }
    await owner.transaction(m=>configureDatabaseBoundary(m,schema,roles));
    for(const pool of pools)await pool.initialize();
    const [runtime,identity,writer]=pools;
    for(const [index,kind] of (["runtime","identity","ledger"] as const).entries())await assertDatabaseBoundary(pools[index],kind,schema);
    const fingerprint=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await runtime.query(
      `SELECT count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
    const before=await fingerprint();
    if(phase!=="before"){
      const previous=JSON.parse(await readFile(`.local-dev/d2b2bs-recovery-${phase==="restart"?"before":"restart"}.json`,"utf8"));
      expect(before).toEqual(previous.after);
    }
    const [receipt]=await runtime.query(`SELECT g.*,a.project_id,a.site_id,a.item_key,a.unit,e.approval_id,e.revision demand_revision,
      p.planning_revision FROM purchase_goods_receipts g JOIN commitment_receipts r ON r.receipt_id=g.id
      JOIN commitment_po_lines b ON b.order_id=g.po_id JOIN commitment_accounts a ON a.id=b.account_id
      JOIN commitment_entitlements e ON e.id=b.entitlement_id JOIN purchase_orders p ON p.id=g.po_id
      WHERE g.status=$1 ORDER BY g.id LIMIT 1`,[phase==="restart"?"quarantined":"pending"]);
    expect(receipt).toBeDefined();
    const [admin]=await identity.query("SELECT id,email FROM users WHERE organization_id=$1 AND role='admin' AND is_active=true LIMIT 1",[receipt.organization_id]);
    const auth=new AuthService(identity),password=randomBytes(24).toString("hex")+"Aa1!";
    await identity.getRepository(User).update(admin.id,{password_hash:await auth.hashPassword(password)});
    const login=await auth.login(admin.email,password),access=login.token!;
    const authority=await TrustedLedgerAuthority.create(writer,env.jwtSecret,schema);
    const demandBefore=await runtime.query("SELECT * FROM commitment_balances ORDER BY account_id");
    const stockBefore=await runtime.query("SELECT id FROM stock_ledger ORDER BY id");
    const request:Extract<LedgerRequest,{action:"receipt"}>={action:"receipt",key:`recovery-${phase}-${suffix}`,input:{
      project:receipt.project_id,site:receipt.site_id,item:receipt.item_key,unit:receipt.unit,approval:receipt.approval_id,
      demandRevision:receipt.demand_revision,id:receipt.id,order:receipt.po_id,orderRevision:receipt.planning_revision,
      line:receipt.line_id,transition:phase==="before"?"quarantine":"accept",revision:receipt.revision,reason:`Synthetic recovery ${phase}`}};
    const token=await authority.issue(access,request);
    await withReceiptHttp(runtime,authority,access,async send=>{
      const result=await send(request,token);expect(result.status).toBe(phase==="before"?"quarantined":"accepted");
      const once=await fingerprint();expect(await send(request,token)).toEqual(result);expect(await fingerprint()).toEqual(once);
      await send(request,token,{closed:true,status:503});expect(await fingerprint()).toEqual(once);
      const duplicate={...request,key:`duplicate-${suffix}`};await send(duplicate,await authority.issue(access,duplicate),{status:409});
      expect(await fingerprint()).toEqual(once);
    });
    expect(await runtime.query("SELECT * FROM commitment_balances ORDER BY account_id")).toEqual(demandBefore);
    expect((await runtime.query("SELECT id FROM stock_ledger")).length-stockBefore.length).toBe(phase==="before"?0:1);
    expect(await runtime.query(`SELECT goods_receipt_id FROM stock_ledger WHERE goods_receipt_id IS NOT NULL GROUP BY goods_receipt_id HAVING count(*)>1`)).toEqual([]);
    await writer.query("SELECT commitment_receipt_check(receipt_id) FROM commitment_receipts");
    await writer.query("SELECT commitment_po_check(order_id) FROM commitment_po_lines");
    const balances=await runtime.query("SELECT * FROM commitment_balances");
    for(const b of balances){
      const replay=replayCommitments(await runtime.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence",[b.account_id]),
        await runtime.query("SELECT * FROM commitment_entitlements WHERE account_id=$1",[b.account_id]));
      expect([replay.approved,replay.fulfilled,replay.held]).toEqual([planningUnits(b.approved),planningUnits(b.fulfilled),planningUnits(b.held)]);
    }
    await writeFile(`.local-dev/d2b2bs-recovery-${phase}.json`,JSON.stringify({phase,database,schema,before,after:await fingerprint(),
      roles,authenticated_http:true,owner_used_only_for_provisioning:true,exact_retry:true,legacy_denied:true,duplicate_accept_denied:true,
      replayed_accounts:balances.length,demand_unchanged:true,stock_delta:phase==="before"?0:1,
      server:await runtime.query("SELECT current_database(),pg_postmaster_start_time()"),
      receipt_states:await runtime.query("SELECT status,count(*)::int count FROM purchase_goods_receipts GROUP BY status ORDER BY status")},null,2));
  }finally{
    for(const pool of pools)if(pool.isInitialized)await pool.destroy();
    for(const role of Object.values(roles)){await owner.query(`DROP OWNED BY ${sqlIdentifier(role)}`);await owner.query(`DROP ROLE ${sqlIdentifier(role)}`);}
    await owner.destroy();
  }
},30000);
