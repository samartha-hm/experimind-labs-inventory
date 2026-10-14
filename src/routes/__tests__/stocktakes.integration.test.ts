import {supplyEntities} from "../../entity/SupplyPlanning";
import {AddReservationsAndProcurement1791676800004} from "../../migration/1791676800004-AddReservationsAndProcurement";
import "reflect-metadata";
import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {DataSource} from "typeorm";
import express from "express";
import type {Server} from "node:http";
import jwt from "jsonwebtoken";
import {randomUUID} from "node:crypto";
import {AppDataSource} from "../../db";
import {env} from "../../config/env";
import {Organization} from "../../entity/Organization";
import {User} from "../../entity/User";
import {InventoryItem} from "../../entity/InventoryItem";
import {UomConversion} from "../../entity/UomConversion";
import {ProductTemplate} from "../../entity/ProductTemplate";
import {ProductTemplateVersion} from "../../entity/ProductTemplateVersion";
import {ProductTemplateRevision} from "../../entity/ProductTemplateRevision";
import {planningEntities} from "../../entity/PlanningProject";
import {stocktakeEntities,Stocktake,type StocktakeTarget} from "../../entity/Stocktake";
import {AddProductTemplates1791417600000} from "../../migration/1791417600000-AddProductTemplates";
import {AddKitSubjectsAndGrades1791417600001} from "../../migration/1791417600001-AddKitSubjectsAndGrades";
import {AddProjectPlanning1791417600002} from "../../migration/1791417600002-AddProjectPlanning";
import {AddPhysicalStocktake1791504000003} from "../../migration/1791504000003-AddPhysicalStocktake";
import {stocktakeRouter} from "../v1/stocktakes";
import {planningProjectRouter} from "../v1/planning-projects";
import {productTemplateRouter} from "../v1/product-templates";
import {planningFixture} from "../../features/projects/__tests__/planningFixture";

const url=process.env.KIT_BUILDER_TEST_DATABASE_URL;
describe.skipIf(!url)("PostgreSQL physical stocktake acceptance",()=>{
  let db:DataSource;let server:Server;let base:string;let maker:User;let admin:User;let viewer:User;let other:User;
  let wire:InventoryItem;let unknown:InventoryItem;let session:Stocktake;let baseline:string;let projectId:string;
  const schema=`stocktake_test_${randomUUID().replaceAll("-","")}`;
  const token=(u:User,claims={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...claims},env.jwtSecret,{expiresIn:"10m"});
  async function request(method:string,path:string,u?:User,body?:unknown,expected=200,claims={}) {
    const r=await fetch(base+"/api/v1"+path,{method,headers:{"Content-Type":"application/json",...(u?{Authorization:`Bearer ${token(u,claims)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await r.text();expect(r.status,text).toBe(expected);return text?JSON.parse(text):null;
  }
  async function start(){const app=express();app.use(express.json());app.use("/api/v1/stocktakes",stocktakeRouter(db));app.use("/api/v1/product-templates",productTemplateRouter(db));app.use("/api/v1/planning-projects",planningProjectRouter(db));server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});const a=server.address();if(!a||typeof a==="string")throw new Error("Missing port");base=`http://127.0.0.1:${a.port}`;}
  const close=()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  const target=(item=wire,locations=["Shelf A","Shelf B"]):StocktakeTarget=>({item_id:item.id,locations,complete_coverage:true});
  const create=(targets:StocktakeTarget[]=[target()])=>request("POST","/stocktakes",maker,{name:"Synthetic count",notes:"Physical verification",targets},201);
  const count=(s:Stocktake,q:string,location="Shelf A",item=wire,unit="m")=>request("PUT",`/stocktakes/${s.id}/count`,maker,{revision:s.revision,item_id:item.id,location,quantity:q,unit});
  const step=(s:Stocktake,action:string,extra={})=>request("POST",`/stocktakes/${s.id}/${action}`,admin,{revision:s.revision,...extra});
  async function reviewed(q:string){let s=await create();s=await count(s,q);return step(s,"review",{reason:"Explicit recount",allow_partial:true});}
  beforeAll(async()=>{
    const parsed=new URL(url!);if(parsed.hostname!=="127.0.0.1"||parsed.port!=="55432"||parsed.pathname!=="/experimind_kitbuilder_test")throw new Error("Refusing non-isolated PostgreSQL");
    const raw=new DataSource({type:"postgres",url});await raw.initialize();try{await raw.query(`CREATE SCHEMA "${schema}"`);}finally{await raw.destroy();}
    const options={type:"postgres" as const,url,schema,ssl:false,uuidExtension:"pgcrypto" as const,entities:AppDataSource.options.entities,migrations:[],extra:{options:`-c search_path=${schema},public`}};
    const bootstrap=new DataSource({...options,entities:(options.entities as Function[]).filter(e=>![ProductTemplate,ProductTemplateVersion,ProductTemplateRevision,...planningEntities,...stocktakeEntities,...supplyEntities].includes(e as typeof ProductTemplate))});
    await bootstrap.initialize();await bootstrap.synchronize();const runner=bootstrap.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{await new AddProductTemplates1791417600000().up(runner);await new AddKitSubjectsAndGrades1791417600001().up(runner);await new AddProjectPlanning1791417600002().up(runner);const migration=new AddPhysicalStocktake1791504000003();await migration.up(runner);await migration.down(runner);await migration.up(runner);await new AddReservationsAndProcurement1791676800004().up(runner);await runner.commitTransaction();}catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();await bootstrap.destroy();}
    db=new DataSource(options);await db.initialize();const a=await db.getRepository(Organization).save({name:schema});const b=await db.getRepository(Organization).save({name:schema+"other"});
    const user=(name:string,role:string,org=a.id)=>db.getRepository(User).save({name,email:name+"@test.invalid",role,organization_id:org,firebase_uid:null});
    maker=await user("Counter","staff");admin=await user("Approver","admin");viewer=await user("Reader","viewer");other=await user("Other","admin",b.id);
    wire=await db.getRepository(InventoryItem).save({organization_id:a.id,name:"Preserved wire",description:"Preserved description",sku:"WIRE",unit:"m",quantity:987,base_price:123,threshold:0});
    unknown=await db.getRepository(InventoryItem).save({organization_id:a.id,name:"Uncounted item",sku:"UNKNOWN",unit:"m",quantity:456,base_price:99,threshold:0});
    // Historical ledger is intentionally excluded from physical truth.
    await db.query(`INSERT INTO stock_ledger(organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type) VALUES($1,$2,'Preserved wire','WIRE',987,987,123,'INITIAL_BALANCE')`,[a.id,wire.id]);
    baseline=JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"));await start();
  },30000);
  afterAll(async()=>{if(server)await close();if(db?.isInitialized)await db.destroy();});
  it("requires explicit tenancy and current database permissions",async()=>{
    await request("GET","/stocktakes",undefined,undefined,401);
    await request("GET","/stocktakes",admin,undefined,403,{orgId:other.organization_id});
    await request("GET","/stocktakes",admin,undefined,403,{orgId:"00000000-0000-0000-0000-000000000000"});
    await request("POST","/stocktakes",viewer,{name:"Forbidden",targets:[]},403,{role:"admin"});
    await db.getRepository(User).update(admin.id,{is_active:false});await request("GET","/stocktakes",admin,undefined,403);await db.getRepository(User).update(admin.id,{is_active:true});
  });
  it("rejects ownership claims, foreign items and duplicate scopes",async()=>{
    await request("POST","/stocktakes",maker,{name:"Invalid",targets:[target()],organization_id:other.organization_id},400);
    await request("POST","/stocktakes",other,{name:"Foreign",targets:[target()]},400);
    await request("POST","/stocktakes",maker,{name:"Duplicate",targets:[target(),target()]},400);
    await request("POST","/stocktakes",maker,{name:"Duplicate location",targets:[target(wire,["Shelf A","Shelf A"])]},400);
    await request("POST","/stocktakes",maker,{name:"Invalid",targets:[{...target(),complete_coverage:undefined}]},400);
  });
  it("starts unverified and creates a draft without mutating inventory",async()=>{
    const items=await request("GET","/stocktakes/inventory",viewer);expect(items.find((i:{id:string})=>i.id===wire.id)).toMatchObject({verified_on_hand:null,stock_status:"unverified",legacy_quantity:"987"});
    session=await create();expect(session.status).toBe("draft");await request("POST",`/stocktakes/${session.id}/post`,admin,{revision:1},409);
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
  });
  it("validates units and quantities and records count identity",async()=>{
    await request("PUT",`/stocktakes/${session.id}/count`,maker,{revision:session.revision,item_id:wire.id,location:"Shelf A",quantity:"-1",unit:"m"},400);
    await request("PUT",`/stocktakes/${session.id}/count`,maker,{revision:session.revision,item_id:wire.id,location:"Undeclared",quantity:"1",unit:"m"},400);
    session=await count(session,"150","Shelf A",wire,"cm");
    await request("POST",`/stocktakes/${session.id}/review`,admin,{revision:session.revision,reason:"Reconcile",allow_partial:true},400);
    await db.getRepository(UomConversion).save({organization_id:other.organization_id,from_uom:"cm",to_uom:"m",conversion_factor:0.01});
    await request("POST",`/stocktakes/${session.id}/review`,admin,{revision:session.revision,reason:"Reconcile",allow_partial:true},400);
    await db.getRepository(UomConversion).save({organization_id:maker.organization_id,item_id:wire.id,from_uom:"cm",to_uom:"m",conversion_factor:0.01});
    expect(session.entries[0].counted_by).toBe(maker.id);
  });
  it("highlights missing counts and requires an explicit partial review",async()=>{
    const view=await request("GET",`/stocktakes/${session.id}`,viewer);expect(view.missing).toEqual([{item_id:wire.id,location:"Shelf B"}]);
    await request("POST",`/stocktakes/${session.id}/review`,maker,{revision:session.revision,reason:"Unauthorized",allow_partial:true},403,{role:"admin"});
    await request("POST",`/stocktakes/${session.id}/review`,admin,{revision:session.revision,reason:"Missing"},400);
    session=await step(session,"review",{reason:"Partial physical count confirmed",allow_partial:true});
    expect(session.entries[0]).toMatchObject({canonical_quantity:"1.5000",baseline:null,reviewed_by:admin.id});expect(session.entries[0].conversion_id).toBeTruthy();
    await request("PUT",`/stocktakes/${session.id}/count`,maker,{revision:session.revision,item_id:wire.id,location:"Shelf A",quantity:"9",unit:"m"},409);
  });
  it("requires approval and posts an opening balance once under concurrent retry",async()=>{
    await request("POST",`/stocktakes/${session.id}/approve`,maker,{revision:session.revision},403,{role:"admin"});
    session=await step(session,"approve");const prior=session.revision;
    const [first,second]=await Promise.all([step(session,"post"),step(session,"post")]);expect(first.id).toBe(second.id);session=first;
    await request("POST",`/stocktakes/${session.id}/post`,admin,{revision:prior});
    const ledger=await request("GET","/stocktakes/ledger",viewer);expect(ledger).toHaveLength(1);expect(ledger[0]).toMatchObject({qty_delta:"1.5000",running_balance:"1.5000",verified_unit:"m",transaction_type:"INITIAL_BALANCE",physical_sequence:1});
    expect((await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===wire.id).verified_on_hand).toBeNull();
  });
  it("protects posted counts, audit history, ledger and historical master values",async()=>{
    await request("PUT",`/stocktakes/${session.id}/count`,maker,{revision:session.revision,item_id:wire.id,location:"Shelf A",quantity:"2",unit:"m"},409);
    await expect(db.query("UPDATE physical_stocktakes SET notes='tamper' WHERE id=$1",[session.id])).rejects.toThrow(/immutable/);
    await expect(db.query("UPDATE stock_ledger SET qty_delta=2 WHERE verification_entry_id IS NOT NULL")).rejects.toThrow(/immutable/);
    await expect(db.query("DELETE FROM physical_stocktake_events WHERE stocktake_id=$1",[session.id])).rejects.toThrow(/immutable/);
    await expect(db.query("UPDATE inventory_items SET quantity=0 WHERE id=$1",[wire.id])).rejects.toThrow(/preserved/);
    await expect(db.query(`INSERT INTO stock_ledger(organization_id,item_id,item_name,item_sku,qty_delta,running_balance,transaction_type) VALUES($1,$2,'x','x',1,1,'MANUAL_ADJUSTMENT')`,[maker.organization_id,wire.id])).rejects.toThrow(/Legacy movements/);
  });
  it("completes remaining location coverage and verifies the ledger sum",async()=>{
    let remaining=await create();remaining=await count(remaining,"0.5","Shelf B");remaining=await step(remaining,"review",{reason:"Remaining shelf counted",allow_partial:true});remaining=await step(remaining,"approve");await step(remaining,"post");
    const item=(await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===wire.id);expect(item).toMatchObject({verified_on_hand:2,available_to_promise:2,stock_status:"verified",active_reservations:0,incoming:0,legacy_quantity:"987"});
    await request("POST","/stocktakes",maker,{name:"Scope change",targets:[target(wire,["Shelf A"])]},409);
  });
  it("calculates a multi-school shortage and recalculates without stock changes",async()=>{
    const fixture=planningFixture(wire.id);const draft=await request("POST","/product-templates",maker,{name:"Demand",subjects:fixture.subjects},201);
    const approved=await request("POST",`/product-templates/${draft.template_id}/approve`,maker,{revision:1},201);
    for(const s of fixture.content.sites)s.selections[0].version_id=approved.id;
    const project=await request("POST","/planning-projects",maker,fixture.content,201);projectId=project.id;
    const before=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));
    for(let i=0;i<2;i++){const result=await request("POST",`/planning-projects/${projectId}/preview`,viewer,{revision:1});expect(result.materials[0]).toMatchObject({gross_demand:3.3,verified_on_hand:2,available_to_promise:2,immediate_shortage:1.3,incoming:0,active_reservations:0});expect(result.operational_release).toBe(false);}
    expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(before);expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
  });
  it("serializes competing stocktakes and rejects stale reviewed balances",async()=>{
    let a=await reviewed("1.6");let b=await reviewed("1.7");a=await step(a,"approve");b=await step(b,"approve");
    const statuses=await Promise.all([a,b].map(s=>fetch(base+`/api/v1/stocktakes/${s.id}/post`,{method:"POST",headers:{Authorization:`Bearer ${token(admin)}`,"Content-Type":"application/json"},body:JSON.stringify({revision:s.revision})}).then(r=>r.status)));
    expect(statuses.sort()).toEqual([200,409]);const loser=statuses[0]===409?a:b;
    // Inspect persisted state instead of depending on request scheduling.
    const notPosted=(await db.getRepository(Stocktake).findBy({id:loser.id}))[0].status!=="posted"?loser:(loser.id===a.id?b:a);
    let reopened=await step(notPosted,"reopen");reopened=await step(reopened,"review",{reason:"Concurrent movement reconciled",allow_partial:true});expect(reopened.entries[0].baseline).not.toBe("1.5000");
  });
  it("posts a downward adjustment and reports exact discrepancy",async()=>{
    let adjusted=await reviewed("0.4");const old=adjusted.entries[0].baseline;expect(old).not.toBeNull();
    adjusted=await step(adjusted,"approve");adjusted=await step(adjusted,"post");
    const ledger=await request("GET","/stocktakes/ledger",viewer);const entry=ledger.find((l:{stocktake_id:string})=>l.stocktake_id===adjusted.id);expect(entry.transaction_type).toBe("CYCLE_COUNT_VARIANCE");expect(Number(entry.qty_delta)).toBeLessThan(0);
    expect((await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===wire.id).verified_on_hand).toBe(0.9);
    const view=await request("GET",`/stocktakes/${adjusted.id}`,viewer);expect(Number(view.counts[0].discrepancy)).toBeCloseTo(0.4-Number(old));
  });
  it("keeps zero verified stock distinct from missing stock",async()=>{
    let zero=await create([target(unknown,["Storage"])]);zero=await count(zero,"0","Storage",unknown);zero=await step(zero,"review",{reason:"Empty location physically checked"});zero=await step(zero,"approve");await step(zero,"post");
    expect((await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===unknown.id)).toMatchObject({verified_on_hand:0,stock_status:"verified",legacy_quantity:"456"});
  });
  it("isolates every session, history, ledger and preview operation",async()=>{
    expect(await request("GET","/stocktakes",other)).toEqual([]);expect(await request("GET","/stocktakes/ledger",other)).toEqual([]);
    for(const path of [`/stocktakes/${session.id}`,`/stocktakes/${session.id}/history`])await request("GET",path,other,undefined,404);
    await request("POST",`/stocktakes/${session.id}/post`,other,{revision:session.revision},404);
    await request("POST",`/planning-projects/${projectId}/preview`,other,{revision:1},404);
    expect(await request("GET","/stocktakes/inventory",other)).toEqual([]);
  });
  it("requires explicit approved coverage before promoting a partial scope",async()=>{
    let partial=await create([{...target(unknown,["Storage"]),complete_coverage:false}]);
    partial=await count(partial,"0","Storage",unknown);partial=await step(partial,"review",{reason:"Coverage is not yet confirmed"});partial=await step(partial,"approve");await step(partial,"post");
    expect((await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===unknown.id).verified_on_hand).toBeNull();
    let confirmed=await create([target(unknown,["Storage"])]);confirmed=await count(confirmed,"0","Storage",unknown);confirmed=await step(confirmed,"review",{reason:"All physical locations now confirmed"});confirmed=await step(confirmed,"approve");await step(confirmed,"post");
    expect((await request("GET","/stocktakes/inventory",viewer)).find((i:{id:string})=>i.id===unknown.id).verified_on_hand).toBe(0);
    await expect(db.query(`INSERT INTO stock_locations(organization_id,item_id,warehouse_id,bin_id,quantity) VALUES($1,$2,'legacy','legacy',5)`,[maker.organization_id,wire.id])).rejects.toThrow(/Legacy location/);
  });
  it("survives HTTP/database restart and refuses destructive populated rollback",async()=>{
    const before=await request("GET","/stocktakes/ledger",viewer);await close();await db.destroy();await db.initialize();await start();expect(await request("GET","/stocktakes/ledger",viewer)).toEqual(before);
    const runner=db.createQueryRunner();await runner.connect();try{await expect(new AddPhysicalStocktake1791504000003().down(runner)).rejects.toThrow(/refuses/);}finally{await runner.release();}
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
  });
});
