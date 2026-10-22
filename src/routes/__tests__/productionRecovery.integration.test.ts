import express from "express";
import type { Server } from "node:http";
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { DataSource, type DataSourceOptions } from "typeorm";
import { expect, it } from "vitest";
import { AppDataSource } from "../../db";
import { env } from "../../config/env";
import { User } from "../../entity/User";
import { AuthService } from "../../services/AuthService";
import { replayCommitments, planningUnits } from "../../services/CommitmentLedgerService";
import { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";
import { assertDatabaseBoundary, configureDatabaseBoundary, sqlIdentifier } from "../../security/databaseBoundary";
import { productionPlanningRouter } from "../v1/production-planning";
import { verifyProductionBrowser } from "./productionBrowser.cases";
import { verifyPackingBrowser } from "./packingBrowser.cases";

const phase=process.env.PRODUCTION_RECOVERY_PHASE;
it.skipIf(!phase)("preserves production custody and authenticated exact retries after restart and restore",async()=>{
  const {schema}=JSON.parse(await readFile(".test-tmp/d3-evidence.json","utf8"));
  const url=new URL(process.env.KIT_BUILDER_TEST_DATABASE_URL!);
  const database=process.env.PRODUCTION_RECOVERY_DATABASE??"experimind_kitbuilder_test";
  if(url.hostname!=="127.0.0.1"||url.port!=="55432"||!/^requirement_test_[a-f0-9]{32}$/.test(schema)
    || !/^(experimind_kitbuilder_test|experimind_production_restore_[a-f0-9]{16})$/.test(database))throw Error("Synthetic recovery target required");
  url.pathname=`/${database}`;
  const options={...AppDataSource.options as Extract<DataSourceOptions,{type:"postgres"}>,url:url.toString(),schema,
    synchronize:false,migrationsRun:false,logging:false as const,extra:{max:2,options:`-c search_path=pg_catalog,${schema},pg_temp`}};
  const owner=await new DataSource(options).initialize(),pools:DataSource[]=[],suffix=randomBytes(8).toString("hex");
  const roles={runtime:`prt_${suffix}`,identity:`pid_${suffix}`,ledger:`plg_${suffix}`};
  let server:Server|undefined;
  try {
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
    const tables=["stock_ledger","commitment_events","commitment_balances","commitment_claims","commitment_entitlements",
      "production_work_orders","production_input_issues","commitment_work_orders","commitment_work_order_materials",
      "commitment_work_order_issues","production_output_custody","trusted_packing_plans","trusted_packing_allocations","trusted_packing_qc","audit_logs","commitment_authorizations"];
    const fingerprint=async()=>Object.fromEntries(await Promise.all(tables.map(async t=>[t,(await runtime.query(
      `SELECT count(*)::int count,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
    const before=await fingerprint();expect(before.production_output_custody.count).toBeGreaterThan(0);
    if(phase!=="before")expect(before).toEqual(JSON.parse(await readFile(`.local-dev/d3-recovery-${phase==="restart"?"before":"restart"}.json`,"utf8")).after);
    const [output]=await runtime.query("SELECT * FROM production_output_custody ORDER BY id LIMIT 1");
    const [admin]=await identity.query("SELECT id,email FROM users WHERE id=$1",[output.actor_id]);
    const auth=new AuthService(identity),password=randomBytes(24).toString("hex")+"Aa1!";
    await identity.getRepository(User).update(admin.id,{password_hash:await auth.hashPassword(password)});
    const access=(await auth.login(admin.email,password)).token!;
    const authority=await TrustedLedgerAuthority.create(writer,env.jwtSecret,schema);
    const app=express();app.use(express.json());app.use("/production",productionPlanningRouter(runtime,authority));
    app.use("/api/v1/production-planning",productionPlanningRouter(runtime,authority));
    server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
    const address=server.address();if(!address||typeof address==="string")throw Error("Missing port");
    const base=`http://127.0.0.1:${address.port}/production`,headers={Authorization:`Bearer ${access}`,"Content-Type":"application/json","Idempotency-Key":output.operation_key};
    const queue=await fetch(base+"/trusted-work-queue",{headers});expect(queue.status).toBe(200);
    expect((await queue.json()).orders.find((o:any)=>o.id===output.order_id).outputs.some((o:any)=>o.id===output.id)).toBe(true);
    const input={order:output.order_id,source:output.source_id,quantity:output.quantity,unit:output.unit,location:output.location};
    const response=await fetch(`${base}/operator/orders/${output.order_id}/finished-outputs`,{method:"POST",headers,body:JSON.stringify(input)});
    expect(response.status).toBe(201);expect(await response.json()).toEqual({id:output.id,order:output.order_id,quantity:output.quantity,qr:output.qr});
    const duplicate=await fetch(`${base}/operator/orders/${output.order_id}/finished-outputs`,{method:"POST",headers:{...headers,"Idempotency-Key":suffix},body:JSON.stringify(input)});
    expect(duplicate.status).toBe(409);
    const packingResponse=await fetch(base+'/trusted-packing',{headers});expect(packingResponse.status).toBe(200);
    const packing=await packingResponse.json();
    expect(packing.plans.flatMap((p:any)=>p.inspections).map((q:any)=>q.decision)).toEqual(expect.arrayContaining(['accept','reject']));
    for(const [table,path] of [['trusted_packing_plans','plans'],['trusted_packing_allocations','allocations'],['trusted_packing_qc','inspections']]) {
      const rows=await runtime.query(`SELECT * FROM ${table} WHERE actor_id=$1`,[admin.id]);expect(rows.length).toBeGreaterThan(0);
      for(const row of rows) {
        const request=path==='plans'?{project:row.project_id,site:row.site_id,approval:row.approval_id,demandRevision:row.demand_revision}:
          path==='allocations'?{plan:row.plan_id,package:row.package_id,output:row.output_id,line:row.line_id,quantity:row.quantity}:
          {plan:row.plan_id,package:row.package_id,allocationRevision:row.allocation_revision,decision:row.decision,checks:row.checks,notes:row.notes};
        const retry=await fetch(`${base}/operator/packing/${path}`,{method:'POST',headers:{...headers,'Idempotency-Key':row.operation_key},body:JSON.stringify(request)});
        expect(retry.status).toBe(201);delete row.created_at;expect(await retry.json()).toEqual(row);
      }
    }
    if(process.env.PRODUCTION_BROWSER==='true'&&phase==='before')await verifyPackingBrowser(app,`http://127.0.0.1:${address.port}`,access,admin,packing);
    if(process.env.PRODUCTION_BROWSER==="true"&&phase==="before")
      await verifyProductionBrowser(app,`http://127.0.0.1:${address.port}`,access,admin,output);
    await expect(runtime.query("UPDATE production_output_custody SET id=id")).rejects.toMatchObject({code:"42501"});
    await writer.query("SELECT commitment_work_order_check(order_id) FROM commitment_work_orders");
    const balances=await runtime.query("SELECT * FROM commitment_balances");
    for(const b of balances){
      const replay=replayCommitments(await runtime.query("SELECT * FROM commitment_events WHERE account_id=$1 ORDER BY sequence",[b.account_id]),
        await runtime.query("SELECT * FROM commitment_entitlements WHERE account_id=$1",[b.account_id]));
      expect([replay.approved,replay.fulfilled,replay.held]).toEqual([planningUnits(b.approved),planningUnits(b.fulfilled),planningUnits(b.held)]);
    }
    expect(await fingerprint()).toEqual(before);
    await writeFile(`.local-dev/d3-recovery-${phase}.json`,JSON.stringify({phase,database,schema,before,after:await fingerprint(),
      authenticated_http:true,exact_retry:true,duplicate_denied:true,replayed_accounts:balances.length,
      operator_browser:process.env.PRODUCTION_BROWSER==="true"&&phase==="before"?"PASS":"not run",
      server:await runtime.query("SELECT current_database(),pg_postmaster_start_time()")},null,2));
  } finally {
    if(server){server.closeAllConnections();await new Promise<void>((resolve,reject)=>server!.close(e=>e?reject(e):resolve()));}
    for(const pool of pools)if(pool.isInitialized)await pool.destroy();
    for(const role of Object.values(roles)){await owner.query(`DROP OWNED BY ${sqlIdentifier(role)}`);await owner.query(`DROP ROLE ${sqlIdentifier(role)}`);}
    await owner.destroy();
  }
},60000);
