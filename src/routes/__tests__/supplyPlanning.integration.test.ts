import {productionEntities} from "../../entity/ProductionPlanning";
import {supplyPlanningRouter} from "../v1/supply-planning";
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
describe.skipIf(!url)("PostgreSQL reservation and procurement acceptance",()=>{
  let db:DataSource;let server:Server;let base:string;let maker:User;let admin:User;let viewer:User;let other:User;
  let wire:InventoryItem;let unknown:InventoryItem;let session:Stocktake;let baseline:string;let projectId:string;
  const schema=`supply_test_${randomUUID().replaceAll("-","")}`;
  const token=(u:User,claims={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...claims},env.jwtSecret,{expiresIn:"10m"});
  async function request(method:string,path:string,u?:User,body?:unknown,expected=200,claims={}) {
    const r=await fetch(base+"/api/v1"+path,{method,headers:{"Content-Type":"application/json",...(u?{Authorization:`Bearer ${token(u,claims)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await r.text();expect(r.status,text).toBe(expected);return text?JSON.parse(text):null;
  }
  async function start(){const app=express();app.use(express.json());app.use("/api/v1/supply-planning",supplyPlanningRouter(db));app.use("/api/v1/stocktakes",stocktakeRouter(db));app.use("/api/v1/product-templates",productTemplateRouter(db));app.use("/api/v1/planning-projects",planningProjectRouter(db));server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});const a=server.address();if(!a||typeof a==="string")throw new Error("Missing port");base=`http://127.0.0.1:${a.port}`;}
  const close=()=>new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
  const target=(item=wire,locations=["Shelf A","Shelf B"]):StocktakeTarget=>({item_id:item.id,locations,complete_coverage:true});
  const create=(targets:StocktakeTarget[]=[target()])=>request("POST","/stocktakes",maker,{name:"Synthetic count",notes:"Physical verification",targets},201);
  const count=(s:Stocktake,q:string,location="Shelf A",item=wire,unit="m")=>request("PUT",`/stocktakes/${s.id}/count`,maker,{revision:s.revision,item_id:item.id,location,quantity:q,unit});
  const step=(s:Stocktake,action:string,extra={})=>request("POST",`/stocktakes/${s.id}/${action}`,admin,{revision:s.revision,...extra});
  async function reviewed(q:string){let s=await create();s=await count(s,q);return step(s,"review",{reason:"Explicit recount",allow_partial:true});}
  beforeAll(async()=>{
    const parsed=new URL(url!);if(parsed.hostname!=="127.0.0.1"||!["55432","55433"].includes(parsed.port)||parsed.pathname!=="/experimind_kitbuilder_test")throw new Error("Refusing non-isolated PostgreSQL");
    const raw=new DataSource({type:"postgres",url});await raw.initialize();try{await raw.query(`CREATE SCHEMA "${schema}"`);}finally{await raw.destroy();}
    const options={type:"postgres" as const,url,schema,ssl:false,uuidExtension:"pgcrypto" as const,entities:AppDataSource.options.entities,migrations:[],extra:{options:`-c search_path=${schema},public`}};
    const bootstrap=new DataSource({...options,entities:(options.entities as Function[]).filter(e=>![ProductTemplate,ProductTemplateVersion,ProductTemplateRevision,...planningEntities,...stocktakeEntities,...supplyEntities,...productionEntities].includes(e as typeof ProductTemplate))});
    await bootstrap.initialize();await bootstrap.synchronize();const runner=bootstrap.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{await new AddProductTemplates1791417600000().up(runner);await new AddKitSubjectsAndGrades1791417600001().up(runner);await new AddProjectPlanning1791417600002().up(runner);const migration=new AddPhysicalStocktake1791504000003();await migration.up(runner);await migration.down(runner);await migration.up(runner);const supplyMigration=new AddReservationsAndProcurement1791676800004();await supplyMigration.up(runner);await supplyMigration.down(runner);await supplyMigration.up(runner);await runner.commitTransaction();}catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();await bootstrap.destroy();}
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
  let siteId:string;let competingProject:string;let competingSite:string;
  let reservation:{id:string;revision:number};let pr:any;let po:any;let receipt:any;let supplierId:string;
  async function supply(method:string,path:string,u=maker,body?:unknown,status=200,key=randomUUID()) {
    const response=await fetch(base+"/api/v1/supply-planning"+path,{method,headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":key},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const data=await response.text();expect(response.status,data).toBe(status);return data?JSON.parse(data):null;
  }
  const preview=()=>request("POST",`/planning-projects/${projectId}/preview`,viewer,{revision:1});
  const balance=async()=>Number((await db.query("SELECT SUM(qty_delta)::text q FROM stock_ledger WHERE item_id=$1 AND verification_entry_id IS NOT NULL",[wire.id]))[0].q);
  it("posts verified opening stock and creates independently owned project/site demand",async()=>{
    let s=await create();s=await count(s,"1.5");s=await count(s,"0.5","Shelf B");s=await step(s,"review",{reason:"All locations counted"});s=await step(s,"approve");await step(s,"post");
    const fixture=planningFixture(wire.id);const draft=await request("POST","/product-templates",maker,{name:"Procurement demand",subjects:fixture.subjects},201);
    const version=await request("POST",`/product-templates/${draft.template_id}/approve`,maker,{revision:1},201);
    for(const site of fixture.content.sites)site.selections[0].version_id=version.id;
    // Keep the same 3.3 m demand at one explicitly selected school for the purchasing walkthrough.
    fixture.content.sites[0].selections.push({...fixture.content.sites[1].selections[0],id:randomUUID()});fixture.content.sites.splice(1);
    const project=await request("POST","/planning-projects",maker,fixture.content,201);projectId=project.id;siteId=project.sites[0].id;
    const alternate=structuredClone(fixture.content);alternate.sites[0].id=randomUUID();for(const selection of alternate.sites[0].selections)selection.id=randomUUID();
    const second=await request("POST","/planning-projects",maker,alternate,201);competingProject=second.id;competingSite=second.sites[0].id;
    expect((await preview()).materials[0]).toMatchObject({gross_demand:3.3,verified_on_hand:2,immediate_shortage:1.3});
  });
  it("rejects missing authentication, forged roles, unknown stock and foreign ownership",async()=>{
    await request("GET","/supply-planning",undefined,undefined,401);
    await supply("POST","/reservations",viewer,{project_id:projectId,site_id:siteId,item_id:wire.id,quantity:"1",unit:"m"},403);
    await supply("POST","/reservations",other,{project_id:projectId,site_id:siteId,item_id:wire.id,quantity:"1",unit:"m"},404);
    await supply("POST","/reservations",maker,{project_id:projectId,site_id:siteId,item_id:unknown.id,quantity:"1",unit:"m"},409);
    await supply("POST","/reservations",maker,{project_id:projectId,site_id:siteId,item_id:wire.id,quantity:"1",unit:"kg"},400);
    expect((await supply("GET","/",other)).reservations).toEqual([]);
  });
  it("serializes competing projects without over-reserving or moving physical stock",async()=>{
    const before=await balance();const bodies=[{project_id:projectId,site_id:siteId},{project_id:competingProject,site_id:competingSite}];
    const responses=await Promise.all(bodies.map(body=>fetch(base+"/api/v1/supply-planning/reservations",{method:"POST",headers:{Authorization:`Bearer ${token(maker)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({...body,item_id:wire.id,quantity:"1.5",unit:"m"})})));
    expect(responses.map(r=>r.status).sort()).toEqual([201,409]);const winner=await responses.find(r=>r.status===201)!.json();
    await supply("POST",`/reservations/${winner.id}/release`,maker,{revision:winner.revision,reason:"Race fixture released"});expect(await balance()).toBe(before);
  });
  it("supports decimal conversions, adjustments, cancellation and immutable history",async()=>{
    await db.getRepository(UomConversion).save({organization_id:maker.organization_id,from_uom:"cm",to_uom:"m",conversion_factor:0.01,is_active:true,item_id:wire.id});
    let r=await supply("POST","/reservations",maker,{project_id:projectId,site_id:siteId,item_id:wire.id,quantity:"50",unit:"cm"},201);expect(r.quantity).toBe("0.5000");
    r=await supply("POST",`/reservations/${r.id}/adjust`,maker,{revision:r.revision,quantity:"0.75",reason:"Explicit adjustment"});
    await supply("POST",`/reservations/${r.id}/adjust`,maker,{revision:1,quantity:"1",reason:"Stale"},409);
    r=await supply("POST",`/reservations/${r.id}/cancel`,maker,{revision:r.revision,reason:"Cancelled"});
    const history=await supply("GET",`/reservation/${r.id}/history`,viewer);expect(history.map((v:any)=>v.revision)).toEqual([3,2,1]);expect(history[2].snapshot.quantity).toBe("0.5000");
    await expect(db.query("UPDATE project_stock_reservations SET quantity=1 WHERE id=$1",[r.id])).rejects.toThrow();expect(await balance()).toBe(2);
  });
  it("reserves 2 m exactly once and credits its own reservation without double subtraction",async()=>{
    const body={project_id:projectId,site_id:siteId,item_id:wire.id,quantity:"2",unit:"m"};const key=randomUUID();
    reservation=await supply("POST","/reservations",maker,body,201,key);expect(await supply("POST","/reservations",maker,body,201,key)).toEqual(reservation);
    await supply("POST","/reservations",maker,{...body,quantity:"1"},409,key);
    expect(await balance()).toBe(2);expect((await preview()).materials[0]).toMatchObject({active_reservations:2,project_reservations:2,available_to_promise:0,immediate_shortage:1.3});
  });
  it("generates a traceable 1.3 m request and enforces PR and PO approval permissions",async()=>{
    pr=await supply("POST","/requests/from-shortage",maker,{project_id:projectId,site_id:siteId,revision:1,qc_required:true},201);
    expect(pr.lines[0]).toMatchObject({canonical_quantity:"1.3000",project_id:projectId,site_id:siteId,demand_revision:1});
    await supply("POST",`/requests/${pr.id}/approve`,maker,{revision:pr.revision},403);
    await supply("POST",`/requests/${pr.id}/approve`,admin,{revision:pr.revision},409);
    pr=await supply("POST",`/requests/${pr.id}/review`,admin,{revision:pr.revision});pr=await supply("POST",`/requests/${pr.id}/approve`,admin,{revision:pr.revision});
    supplierId=(await supply("POST","/suppliers",maker,{name:"Synthetic supplier"},201)).id;
    po=await supply("POST","/orders",maker,{request_id:pr.id,revision:pr.revision,supplier_id:supplierId},201);
    expect((await preview()).materials[0].incoming).toBe(0);
    await supply("POST",`/orders/${po.id}/receipts`,maker,{revision:po.planning_revision,line_id:po.planning_lines[0].id,quantity:"0.5",unit:"m",location:"Shelf A"},503);
    po=await supply("POST",`/orders/${po.id}/review`,admin,{revision:po.planning_revision});
    await supply("POST",`/orders/${po.id}/approve`,maker,{revision:po.planning_revision},403);
    po=await supply("POST",`/orders/${po.id}/approve`,admin,{revision:po.planning_revision});
    expect((await preview()).materials[0]).toMatchObject({incoming:1.3,projected_shortage:0,immediate_shortage:1.3});
  });
  it("fails closed for old clients and QC without authority, including concurrent requests",async()=>{
    const before=await db.query("SELECT * FROM stock_ledger ORDER BY id");
    const receipts=await db.query("SELECT * FROM purchase_goods_receipts ORDER BY id");
    const body={revision:po.planning_revision,line_id:po.planning_lines[0].id,quantity:"0.5",unit:"m",location:"Shelf A"};
    await Promise.all([1,2].map(()=>supply("POST",`/orders/${po.id}/receipts`,maker,body,503)));
    for(const verb of ["accept","reject","quarantine"])
      await supply("POST",`/receipts/${randomUUID()}/${verb}`,admin,{revision:1,reason:"Legacy client"},503);
    expect(await db.query("SELECT * FROM stock_ledger ORDER BY id")).toEqual(before);
    expect(await db.query("SELECT * FROM purchase_goods_receipts ORDER BY id")).toEqual(receipts);
    expect(await balance()).toBe(2);
  });
  it("supports request edits and cancellation but denies automatic non-QC receipt",async()=>{
    await supply("POST","/requests",maker,{lines:[{item_id:wire.id,quantity:"0",unit:"m"}]},400);
    await supply("POST","/requests",maker,{lines:[{item_id:wire.id,quantity:"1",unit:"invalid"}]},400);
    let manual=await supply("POST","/requests",maker,{lines:[{item_id:wire.id,quantity:"10",unit:"cm",qc_required:false}]},201);
    const first=manual.revision;
    manual=await supply("PUT",`/requests/${manual.id}`,maker,{revision:first,lines:[{item_id:wire.id,quantity:"20",unit:"cm",qc_required:false}],notes:"Explicit no-QC order"});
    await supply("PUT",`/requests/${manual.id}`,maker,{revision:first,lines:[{item_id:wire.id,quantity:"1",unit:"m"}]},409);
    manual=await supply("POST",`/requests/${manual.id}/review`,admin,{revision:manual.revision});
    manual=await supply("POST",`/requests/${manual.id}/approve`,admin,{revision:manual.revision});
    let order=await supply("POST","/orders",maker,{request_id:manual.id,revision:manual.revision,supplier_id:supplierId},201);
    order=await supply("POST",`/orders/${order.id}/review`,admin,{revision:order.planning_revision});
    order=await supply("POST",`/orders/${order.id}/approve`,admin,{revision:order.planning_revision});
    const before=await balance();
    await supply("POST",`/orders/${order.id}/receipts`,maker,{revision:order.planning_revision,line_id:order.planning_lines[0].id,quantity:"20",unit:"cm",location:"Shelf B"},503);
    expect(await balance()).toBe(before);
    let cancelled=await supply("POST","/requests",maker,{lines:[{item_id:wire.id,quantity:"1",unit:"m"}]},201);
    cancelled=await supply("POST",`/requests/${cancelled.id}/cancel`,maker,{revision:cancelled.revision});
    expect(cancelled.status).toBe("cancelled");await supply("POST",`/requests/${cancelled.id}/review`,admin,{revision:cancelled.revision},409);
    await request("POST",`/planning-projects/${projectId}/archive`,maker,{revision:1},409);
  });
  it("fulfills once, protects reserved stock against counts and keeps planning read-only",async()=>{
    const before=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));await preview();await preview();expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(before);
    let s=await create();s=await count(s,"0","Shelf A");s=await count(s,"0","Shelf B");s=await step(s,"review",{reason:"Insufficient reserved count"});s=await step(s,"approve");await request("POST",`/stocktakes/${s.id}/post`,admin,{revision:s.revision},409);
    // Fulfillment chooses one physical location; consolidate existing counted stock explicitly.
    let consolidated=await create();consolidated=await count(consolidated,"2","Shelf A");consolidated=await count(consolidated,"0","Shelf B");
    consolidated=await step(consolidated,"review",{reason:"Consolidated physical count"});consolidated=await step(consolidated,"approve");await step(consolidated,"post");
    const key=randomUUID(),body={revision:reservation.revision,reason:"Explicit future fulfillment test",location:"Shelf A"};
    const fulfilled=await supply("POST",`/reservations/${reservation.id}/fulfill`,admin,body,200,key);expect(await supply("POST",`/reservations/${reservation.id}/fulfill`,admin,body,200,key)).toEqual(fulfilled);
    expect(await balance()).toBe(0);expect((await preview()).materials[0]).toMatchObject({active_reservations:0,fulfilled_quantity:2,immediate_shortage:1.3});
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
    const runner=db.createQueryRunner();await runner.connect();try{await expect(new AddReservationsAndProcurement1791676800004().down(runner)).rejects.toThrow(/refus/i);}finally{await runner.release();}
    await close();await db.destroy();await db.initialize();await start();expect(await balance()).toBe(0);expect((await supply("GET","/",viewer)).orders[0].vendor_id).toBe(supplierId);
  });
});
