import express from "express";
import type { Server } from "node:http";
import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { InventoryItem } from "../../entity/InventoryItem";
import { User } from "../../entity/User";
import { TrustedRecipePublication1792972800023 } from "../../migration/1792972800023-TrustedRecipePublication";
import { configureDatabaseBoundary, assertDatabaseBoundary } from "../../security/databaseBoundary";
import { TrustedLedgerAuthority, type LedgerRequest } from "../../security/TrustedLedgerAuthority";
import { AuthService } from "../../services/AuthService";
import { env } from "../../config/env";
import { productionPlanningRouter } from "../v1/production-planning";
import type { verifyExecutionBoundary } from "./executionBoundary.cases";
import type { PublishedRecipe } from "../../services/RecipePublicationService";

type Publication = Extract<LedgerRequest, { action: "publishRecipe" }>;
export async function verifyRecipePublication(h: Parameters<typeof verifyExecutionBoundary>[0] & {password:string}) {
  const snapshot=async()=>Object.fromEntries(await Promise.all(["stock_ledger","commitment_events","commitment_balances","commitment_claims"].map(async t=>
    [t,(await h.db.query(`SELECT count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${t} t`))[0]])));
  const before=await snapshot();
  await h.db.transaction(async m=>{
    const r=m.queryRunner!; await new TrustedRecipePublication1792972800023().up(r);
    await configureDatabaseBoundary(m,h.schema,h.roles);
  });
  for(const [pool,kind] of [[h.runtime,"runtime"],[h.identity,"identity"],[h.writer,"ledger"]] as const)
    await assertDatabaseBoundary(pool,kind,h.schema);
  const output=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:"Synthetic recipe output",unit:"ea",sku:randomUUID(),base_price:0,quantity:0,threshold:0});
  const input=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:"Synthetic recipe input",unit:"g",sku:randomUUID(),base_price:0,quantity:0,threshold:0});
  const authority=await TrustedLedgerAuthority.create(h.writer,env.jwtSecret,h.schema);
  const {token}=await new AuthService(h.identity).login(h.admin.email,h.password);
  const app=express(); app.use(express.json()); app.use("/production",productionPlanningRouter(h.runtime,authority));
  app.use("/closed",productionPlanningRouter(h.runtime));
  const server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});
  const address=server.address(); if(!address||typeof address==="string")throw Error("Missing port");
  const request=():Publication=>({action:"publishRecipe",key:randomUUID(),input:{name:"Canonical test recipe",definition:{
    output_item_id:output.id,unit:"ea",yield_quantity:"2",instructions:"",specification:"",concentration:"",
    inputs:[{item_id:input.id,unit:"g",quantity:"3",canonical_quantity:"3",scrap_percent:"0"}]}}});
  async function send(r:Publication,cap:string,status:number|readonly number[]=201,access=token,path="production") {
    const response=await fetch(`http://127.0.0.1:${typeof address==="object"&&address?address.port:0}/${path}/recipe-versions`,{
      method:"POST",headers:{Authorization:access?`Bearer ${access}`:"","Content-Type":"application/json","Idempotency-Key":r.key,"X-Ledger-Capability":cap},body:JSON.stringify(r.input)});
    const body=await response.json(); expect(Array.isArray(status)?status:[status],JSON.stringify(body)).toContain(response.status); return body as PublishedRecipe;
  }
  const count=async()=>Number((await h.db.query("SELECT count(*) FROM production_recipes WHERE authority_key IS NOT NULL"))[0].count);
  try {
    const r=request(),cap=await authority.issue(token,r);
    await send(r,cap,401,""); await send(r,"",403); await send(r,cap,503,token,"closed");
    const results=await Promise.all([send(r,cap),send(r,cap)]);expect(results[0]).toEqual(results[1]);expect(await count()).toBe(1);
    expect(await send(r,cap)).toEqual(results[0]);
    await send({...r,input:{...r.input,name:"Tampered"}},cap,409);
    const changed=request();changed.key=r.key;await send(changed,await authority.issue(token,changed),409);
    const forks=[request(),request()];for(const f of forks)f.input.predecessor=results[0].id;
    const caps=await Promise.all(forks.map(f=>authority.issue(token,f)));
    const outcomes=await Promise.all(forks.map((f,i)=>send(f,caps[i],[201,409])));
    expect(outcomes.filter(o=>o.id)).toHaveLength(1);expect(await count()).toBe(2);
    const cross=request();cross.input.predecessor=h.other.id;
    await send(cross,await authority.issue(token,cross),409);
    const foreign=await h.db.getRepository(InventoryItem).save({organization_id:h.other.organization_id,name:"Other tenant input",unit:"g",sku:randomUUID(),base_price:0,quantity:0,threshold:0});
    const foreignRequest=request();foreignRequest.input.definition.inputs[0].item_id=foreign.id;
    await send(foreignRequest,await authority.issue(token,foreignRequest),409);
    const auth=new AuthService(h.identity);
    await h.identity.getRepository(User).update(h.other.id,{password_hash:await auth.hashPassword(h.password)});
    const other=await auth.login(h.other.email,h.password);
    await send(r,cap,409,other.token);
    const otherRequest=request();await send(otherRequest,await authority.issue(other.token,otherRequest),409,other.token);
    for(const quantity of ["0","0.00001","-1"]){const bad=request();bad.input.definition.inputs[0].quantity=quantity;await send(bad,await authority.issue(token,bad),409);}
    const forged=request();forged.input.definition.inputs[0].canonical_quantity="300";await send(forged,await authority.issue(token,forged),409);
    for(const db of [h.runtime,h.identity]) await expect(db.query("INSERT INTO production_recipes DEFAULT VALUES")).rejects.toMatchObject({code:"42501"});
    await expect(h.writer.query("UPDATE production_recipes SET name=name")).rejects.toMatchObject({code:"42501"});
    await expect(h.db.query("UPDATE production_recipes SET name=name")).rejects.toMatchObject({code:"23514"});
    await expect(h.writer.query(`INSERT INTO production_recipes(id,organization_id,family_id,version,revision,name,status,definition,created_by,approved_by,authority_key)
      SELECT $1,organization_id,$2,1,1,name,status,definition,created_by,approved_by,$3 FROM production_recipes WHERE id=$4`,
      [randomUUID(),randomUUID(),randomUUID(),results[0].id])).rejects.toMatchObject({code:"23514"});
    const fail=request();
    await h.db.query(`CREATE FUNCTION commitment_recipe_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
      IF NEW.operation_key='${fail.key}' THEN RAISE EXCEPTION 'Injected authorization failure'; END IF; RETURN NEW; END $$;
      REVOKE ALL ON FUNCTION commitment_recipe_test_failure() FROM PUBLIC;
      CREATE TRIGGER z_recipe_test_failure BEFORE INSERT ON commitment_authorizations FOR EACH ROW EXECUTE FUNCTION commitment_recipe_test_failure()`);
    try {await send(fail,await authority.issue(token,fail),409);}finally{await h.db.query("DROP TRIGGER z_recipe_test_failure ON commitment_authorizations; DROP FUNCTION commitment_recipe_test_failure()");}
    expect(await count()).toBe(2);
    expect(await h.db.query("SELECT id FROM commitment_authorizations WHERE operation_key=$1",[fail.key])).toHaveLength(0);
    const rows=await h.db.query(`SELECT r.*,a.result FROM production_recipes r JOIN commitment_authorizations a ON
      a.organization_id=r.organization_id AND a.actor_id=r.created_by AND a.operation_key=r.authority_key WHERE r.authority_key IS NOT NULL`);
    expect(rows).toHaveLength(2);for(const row of rows){expect(row.result.id).toBe(row.id);expect(row.created_by).toBe(h.admin.id);expect(row.approved_by).toBe(h.admin.id);}
    expect(await snapshot()).toEqual(before);
    h.evidence.recipe_publication={http:"PASS",versions:2,duplicate_retry:"same immutable version",competing_predecessors:"one winner",rollback:"recipe and authorization absent",stock_and_commitments:"unchanged"};
  } finally {server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
