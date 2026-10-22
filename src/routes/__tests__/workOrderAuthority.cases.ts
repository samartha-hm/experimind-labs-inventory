import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { InventoryItem } from "../../entity/InventoryItem";
import { TrustedWorkOrderAuthority1793059200024 } from "../../migration/1793059200024-TrustedWorkOrderAuthority";
import { AddFinishedOutputCustody1793059200025 } from "../../migration/1793059200025-AddFinishedOutputCustody";
import { configureDatabaseBoundary, assertDatabaseBoundary } from "../../security/databaseBoundary";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { AuthService } from "../../services/AuthService";
import { StocktakeService } from "../../services/StocktakeService";
import { env } from "../../config/env";
import { productionPlanningRouter } from "../v1/production-planning";
import type { verifyExecutionBoundary } from "./executionBoundary.cases";
import type { Fixture } from "./trustedLedgerBoundary.cases";
import type { WorkOrderResult, WorkOrderIssueResult } from "../../services/WorkOrderAuthorityService";

type Claim=Extract<LedgerRequest,{action:"claimWorkOrder"}>;
type Issue=Extract<LedgerRequest,{action:"issueWorkOrder"}>;
type Output=Extract<LedgerRequest,{action:"recordFinishedOutput"}>;
export async function verifyWorkOrderAuthority(h:Parameters<typeof verifyExecutionBoundary>[0]&{password:string;fixture:()=>Promise<Fixture>}) {
  await h.db.transaction(async m=>{
    await new TrustedWorkOrderAuthority1793059200024().up(m.queryRunner!);
    await new AddFinishedOutputCustody1793059200025().up(m.queryRunner!);
    await configureDatabaseBoundary(m,h.schema,h.roles);
  });
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const f=await h.fixture();
  const [{item_key:output}]=await h.db.query("SELECT item_key FROM commitment_accounts WHERE id=$1",[f.account]);
  const input=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:"Synthetic D3 input",unit:"g",sku:randomUUID(),base_price:0,quantity:0,threshold:0});
  const authority=await TrustedLedgerAuthority.create(h.writer,env.jwtSecret,h.schema);
  const {token}=await new AuthService(h.identity).login(h.admin.email,h.password);
  const app=express();app.use(express.json());app.use("/production",productionPlanningRouter(h.runtime,authority));
  app.use("/closed",productionPlanningRouter(h.runtime));
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  const address=server.address();if(!address||typeof address==="string")throw Error("Missing port");
  async function send(r:LedgerRequest,cap:string,status:number|number[]=201,access=token,closed=false,operator=false):Promise<any> {
    const path=r.action==="publishRecipe"?"recipe-versions":r.action==="claimWorkOrder"?"work-order-claims":r.action==="issueWorkOrder"?`orders/${r.input.order}/material-issues`:r.action==="recordFinishedOutput"?`orders/${r.input.order}/finished-outputs`:"invalid";
    const response=await fetch(`http://127.0.0.1:${address&&typeof address==="object"?address.port:0}/${closed?"closed":"production"}/${operator?"operator/":""}${path}`,{
      method:"POST",headers:{Authorization:access?`Bearer ${access}`:"","Content-Type":"application/json","Idempotency-Key":r.key,"X-Ledger-Capability":cap},body:JSON.stringify("input" in r?r.input:{})});
    const body=await response.json();expect(Array.isArray(status)?status:[status],JSON.stringify(body)).toContain(response.status);return body;
  }
  const snapshot=async()=>Object.fromEntries(await Promise.all(["stock_ledger","commitment_events","commitment_balances","commitment_claims","production_work_orders","production_input_reservations","production_input_issues","commitment_work_orders","commitment_work_order_materials","commitment_work_order_issues","production_output_custody","audit_logs","commitment_authorizations"].map(async t=>
    [t,(await h.db.query(`SELECT count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
  try {
    const publication:Extract<LedgerRequest,{action:"publishRecipe"}>={action:"publishRecipe",key:randomUUID(),input:{name:"Synthetic D3 recipe",definition:{output_item_id:output,unit:"m",yield_quantity:"0.1",instructions:"",specification:"",concentration:"",inputs:[{item_id:input.id,quantity:"1",canonical_quantity:"1",unit:"g",scrap_percent:"0"}]}}};
    const recipe=await send(publication,await authority.issue(token,publication));
    const claim=(scope=f,quantity="0.1"):Claim=>({action:"claimWorkOrder",key:randomUUID(),input:{project:scope.project.id,site:scope.site,approval:scope.approval.id,demandRevision:1,recipe:recipe.id,quantity,unit:"m",source:randomUUID()}});
    const request=claim(),cap=await authority.issue(token,request);
    await send(request,cap,401,"");await send(request,"",403);await send(request,cap,503,token,true);
    const results:WorkOrderResult[]=await Promise.all([send(request,cap),send(request,cap)]);
    expect(results[0]).toEqual(results[1]);const first=results[0];expect(first.materials[0].quantity).toBe("1.0000");
    expect(await send(request,cap)).toEqual(first);
    const unchanged=await snapshot();
    await send({...request,input:{...request.input,quantity:"0.2"}},cap,409);
    const duplicate={...request,key:randomUUID()};await send(duplicate,await authority.issue(token,duplicate),409);
    for(const change of [{quantity:"0.00001"},{unit:"cm"},{site:f.project.sites[1].id},{project:h.other.id},{recipe:h.other.id}]){
      const bad:Claim={...claim(),input:{...request.input,source:randomUUID(),...change}};
      // A different owned school is allowed only with its own approved line, so use an inconsistent approval scope below.
      if("site" in change)bad.input.site=h.other.id;
      await send(bad,await authority.issue(token,bad),409);
    }
    expect(await snapshot()).toEqual(unchanged);
    const competitors=[claim(),claim()];const caps=await Promise.all(competitors.map(r=>authority.issue(token,r)));
    const race=await Promise.all(competitors.map((r,i)=>send(r,caps[i],[201,409])));
    expect(race.filter(r=>r.id)).toHaveLength(1);const second:WorkOrderResult=race.find(r=>r.id);
    const over=claim();await send(over,await authority.issue(token,over),409);
    const stocktake=new StocktakeService(h.db);
    let count=await stocktake.create(h.admin.organization_id,h.admin.id,"Synthetic D3 count","",[{item_id:input.id,locations:["Shelf A"],complete_coverage:true}]);
    count=await stocktake.count(h.admin.organization_id,count.id,h.admin.id,count.revision,input.id,"Shelf A","1.5","g");
    for(const action of ["review","approve","post"] as const)count=await stocktake.transition(h.admin.organization_id,count.id,h.admin.id,count.revision,action,"Synthetic D3 verification");
    const issue=(order=first,quantity="0.2"):Issue=>({action:"issueWorkOrder",key:randomUUID(),input:{order:order.id,material:order.materials[0].id,source:randomUUID(),quantity,unit:"g",location:"Shelf A",reason:"Synthetic authorized issue"}});
    const partial=issue(),partialCap=await authority.issue(token,partial);
    const outputRequest=(quantity="0.0200"):Output=>({action:"recordFinishedOutput",key:randomUUID(),input:{order:first.id,source:randomUUID(),quantity,unit:"m",location:"Production shelf"}});
    const premature=outputRequest(),beforeOutput=await snapshot();
    await send(premature,await authority.issue(token,premature),409);
    expect(await snapshot()).toEqual(beforeOutput);
    const issued:WorkOrderIssueResult=await send(partial,partialCap);
    expect(issued.quantity).toBe("0.2000");expect(await send(partial,partialCap)).toEqual(issued);
    expect(await send(partial,"",201,token,false,true)).toEqual(issued);
    await send({...partial,input:{...partial.input,quantity:"0.1"}},"",409,token,false,true);
    const afterPartial=await snapshot();
    const duplicateIssue={...partial,key:randomUUID()};await send(duplicateIssue,await authority.issue(token,duplicateIssue),409);
    for(const change of [{quantity:"0.8001"},{quantity:"0.00001"},{unit:"kg"},{material:second.materials[0].id},{order:h.other.id},{location:"Unverified"},{scrap_quantity:"0.1"}]){
      const bad:Issue={...issue(),input:{...partial.input,source:randomUUID(),...change}};await send(bad,await authority.issue(token,bad),409);
    }
    expect(await snapshot()).toEqual(afterPartial);
    // Output cannot outrun consumption, even when independent capabilities race.
    const outputAttempts=[outputRequest(),outputRequest()];
    const outputCaps=await Promise.all(outputAttempts.map(r=>authority.issue(token,r)));
    const outputResults=await Promise.all(outputAttempts.map((r,i)=>send(r,outputCaps[i],[201,409],token,false,i===0)));
    expect(outputResults.filter(r=>r.id)).toHaveLength(1);
    const winner=outputResults.findIndex(r=>r.id),finished=outputResults[winner];
    expect(await send(outputAttempts[winner],"",201,token,false,true)).toEqual(finished);
    expect(finished.qr).toBe(`ERP:OUTPUT:${finished.id}`);
    const outputSnapshot=await snapshot();
    const duplicateOutput={...outputAttempts[winner],key:randomUUID()};
    await send(duplicateOutput,await authority.issue(token,duplicateOutput),409);
    for(const change of [{quantity:"0.00001"},{quantity:"0.1001"},{unit:"g"},{order:h.other.id},{status:"accepted"},{location:""}]) {
      const invalid:Output={...outputRequest(),input:{...outputRequest().input,...change}};
      await send(invalid,await authority.issue(token,invalid),409);
    }
    await send(outputRequest(),outputCaps[winner],409);
    await send(outputAttempts[winner],"",403);
    await send(outputAttempts[winner],outputCaps[winner],503,token,true);
    // A durable result never bypasses live session validation on the operator path.
    const revokedSession=await new AuthService(h.identity).login(h.admin.email,h.password);
    await new AuthService(h.identity).revokeRefreshToken(revokedSession.refreshToken!);
    await send(outputAttempts[winner],"",409,revokedSession.token,false,true);
    await send(outputRequest(),"",409,revokedSession.token,false,true);
    await send(outputAttempts[winner],"",401,"",false,true);
    expect(await snapshot()).toEqual(outputSnapshot);
    const [custody]=await h.db.query("SELECT * FROM production_output_custody WHERE id=$1",[finished.id]);
    expect(custody.status).toBe("pending_qc");expect(custody.output_type).toBe("recipe_output");
    expect(custody.input_basis).toEqual([{material:first.materials[0].id,item:input.id,quantity:"0.2000",unit:"g",issues:[issued.id]}]);
    for(const table of ["stock_ledger","commitment_events","commitment_balances","commitment_claims"])
      expect(outputSnapshot[table]).toEqual(afterPartial[table]);
    // Inject failures after each durable stage. All data, including capability receipt, must roll back.
    for(const table of ["stock_ledger","commitment_events","audit_logs","commitment_authorizations"]) {
      const failure=issue(first,"0.0001"),failureCap=await authority.issue(token,failure),before=await snapshot();
      await h.db.query(`CREATE FUNCTION commitment_d3_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected D3 failure'; END $$;
        REVOKE ALL ON FUNCTION commitment_d3_test_failure() FROM PUBLIC;
        CREATE TRIGGER z_d3_test_failure AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_d3_test_failure()`);
      try{await send(failure,failureCap,409);}finally{await h.db.query(`DROP TRIGGER z_d3_test_failure ON ${table}; DROP FUNCTION commitment_d3_test_failure()`);}
      expect(await snapshot()).toEqual(before);
    }
    const attempts=[issue(first,"0.8"),issue(second,"0.8")],issueCaps=await Promise.all(attempts.map(r=>authority.issue(token,r)));
    const outcomes=await Promise.all(attempts.map((r,i)=>send(r,issueCaps[i],[201,409])));
    expect(outcomes.filter(r=>r.id)).toHaveLength(1);
    const supplied=attempts[outcomes.findIndex(r=>r.id)].input.order;
    for(const table of ["production_output_custody","audit_logs","commitment_authorizations"]) {
      const failure:Output={...outputRequest("0.0100"),input:{...outputRequest("0.0100").input,order:supplied}};
      const before=await snapshot();
      await h.db.query(`CREATE FUNCTION commitment_d3_output_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected custody failure'; END $$;
        REVOKE ALL ON FUNCTION commitment_d3_output_failure() FROM PUBLIC;
        CREATE TRIGGER z_d3_output_failure AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_d3_output_failure()`);
      try{await send(failure,"",409,token,false,true);}finally{await h.db.query(`DROP TRIGGER z_d3_output_failure ON ${table}; DROP FUNCTION commitment_d3_output_failure()`);}
      expect(await snapshot()).toEqual(before);
    }
    const queue=await fetch(`http://127.0.0.1:${address.port}/production/trusted-work-queue`,{headers:{Authorization:`Bearer ${token}`}});
    expect(queue.status).toBe(200);const view=await queue.json();expect(view.enabled).toBe(true);
    expect(view.orders.find((o:any)=>o.id===first.id).outputs.map((o:any)=>o.id)).toEqual([finished.id]);
    // A writer cannot invent custody without a matching signed transaction receipt.
    const directId=randomUUID();
    await expect(h.writer.query(`INSERT INTO production_output_custody
      (id,organization_id,order_id,source_id,quantity,unit,location,actor_id,operation_key,qr)
      VALUES($1,$2,$3,$4,'0.0100','m','Shelf',$5,$6,$7)`,
      [directId,h.admin.organization_id,supplied,randomUUID(),h.admin.id,randomUUID(),`ERP:OUTPUT:${directId}`])).rejects.toMatchObject({code:"23514"});
    const balances=await h.db.query(`SELECT b.approved,b.fulfilled,b.held FROM commitment_work_order_materials m JOIN commitment_balances b ON b.account_id=m.account_id WHERE m.order_id=ANY($1::uuid[]) ORDER BY m.order_id`,[[first.id,second.id]]);
    expect(balances).toHaveLength(2);expect(balances.reduce((n:number,b:any)=>n+Number(b.fulfilled),0)).toBe(1);
    expect(balances.reduce((n:number,b:any)=>n+Number(b.held),0)).toBe(1);
    const [{quantity}]=await h.db.query("SELECT sum(qty_delta)::text quantity FROM stock_ledger WHERE item_id=$1",[input.id]);expect(Number(quantity)).toBe(0.5);
    expect(await h.db.query("SELECT id FROM production_input_issues WHERE order_id=ANY($1::uuid[])",[[first.id,second.id]])).toHaveLength(2);
    await expect(h.runtime.query("INSERT INTO production_input_issues DEFAULT VALUES")).rejects.toMatchObject({code:"42501"});
    await expect(h.writer.query("UPDATE commitment_work_order_materials SET item_id=item_id")).rejects.toMatchObject({code:"42501"});
    await expect(h.runtime.query("INSERT INTO production_output_custody DEFAULT VALUES")).rejects.toMatchObject({code:"42501"});
    await expect(h.writer.query("UPDATE production_output_custody SET quantity=quantity")).rejects.toMatchObject({code:"42501"});
    await expect(h.db.query("DELETE FROM production_output_custody")).rejects.toMatchObject({code:"23514"});
    await expect(h.db.query("UPDATE audit_logs SET action=action WHERE entity_type='trusted_production'")).rejects.toMatchObject({code:"23514"});
    h.evidence.work_order_authority={http:"PASS",exclusive_output_claims:2,material_budget:"2 g held initially, 1 g fulfilled, 1 g held",stock:"1.5 g verified, 1 g issued, 0.5 g remaining",concurrent_claims:"one winner",concurrent_issues:"one winner",rollback_stages:4,retry:"same immutable issue",recovery:"PostgreSQL restart/restore remains acceptance gate"};
    h.evidence.output_custody={http:"PASS",quantity:"0.0200 m",input_basis:"0.2000 g issued",concurrency:"one winner",retry:"same immutable identity",status:"pending_qc",stock_and_delivery:"unchanged",packing:"blocked",rollback_stages:3,operator_http:"PASS",queue:"PASS",unsigned_writer:"denied"};
  } finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
