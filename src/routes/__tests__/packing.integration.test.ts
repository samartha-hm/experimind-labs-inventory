import { labelLayoutRouter } from "../v1/labelLayouts";
import { AddSharedLabelLayouts1792281600012 } from "../../migration/1792281600012-AddSharedLabelLayouts";
import { attachmentRouter } from "../v1/attachments";
import { AddPrivateAttachments1792195200011 } from "../../migration/1792195200011-AddPrivateAttachments";
import { deliveryRouter } from "../v1/delivery";
import { AddDeliveryCustody1792022400009 } from "../../migration/1792022400009-AddDeliveryCustody";
import { AddProjectCompletion1792108800010 } from "../../migration/1792108800010-AddProjectCompletion";
import {packingRouter} from "../v1/packing";
import {packingLabelPDF, packageDestination} from "../../features/packing/packingLabels";
import {HardenPackingReadiness1791936000008} from "../../migration/1791936000008-HardenPackingReadiness";
import {AddPacking1791849600007} from "../../migration/1791849600007-AddPacking";
import {HardenProductionReconciliation1791763200006} from "../../migration/1791763200006-HardenProductionReconciliation";
import {AddProductionPlanning1791763200005} from "../../migration/1791763200005-AddProductionPlanning";
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
describe.skipIf(!url)("PostgreSQL packing acceptance",()=>{
  let db:DataSource;let server:Server;let base:string;let maker:User;let admin:User;let viewer:User;let other:User;
  let wire:InventoryItem;let finished:InventoryItem;let unknown:InventoryItem;let session:Stocktake;let baseline:string;let projectId:string;
  const schema=`packing_test_${randomUUID().replaceAll("-","")}`;
  const token=(u:User,claims={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...claims},env.jwtSecret,{expiresIn:"10m"});
  async function request(method:string,path:string,u?:User,body?:unknown,expected=200,claims={}) {
    const r=await fetch(base+"/api/v1"+path,{method,headers:{"Content-Type":"application/json",...(u?{Authorization:`Bearer ${token(u,claims)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await r.text();expect(r.status,text).toBe(expected);return text?JSON.parse(text):null;
  }
  async function start(){const app=express();app.use(express.json());app.use("/api/v1/attachments",attachmentRouter(db));app.use("/api/v1/packing-label-layouts",labelLayoutRouter(db));app.use("/api/v1/packing",packingRouter(db));app.use("/api/v1/delivery",deliveryRouter(db));app.use("/api/v1/supply-planning",supplyPlanningRouter(db));app.use("/api/v1/stocktakes",stocktakeRouter(db));app.use("/api/v1/product-templates",productTemplateRouter(db));app.use("/api/v1/planning-projects",planningProjectRouter(db));server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});const a=server.address();if(!a||typeof a==="string")throw new Error("Missing port");base=`http://127.0.0.1:${a.port}`;}
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
    const bootstrap=new DataSource({...options,entities:(options.entities as Function[]).filter(e=>![ProductTemplate,ProductTemplateVersion,ProductTemplateRevision,...planningEntities,...stocktakeEntities,...supplyEntities,...productionEntities].includes(e as typeof ProductTemplate))});
    await bootstrap.initialize();await bootstrap.synchronize();const runner=bootstrap.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{await new AddProductTemplates1791417600000().up(runner);await new AddKitSubjectsAndGrades1791417600001().up(runner);await new AddProjectPlanning1791417600002().up(runner);const migration=new AddPhysicalStocktake1791504000003();await migration.up(runner);await migration.down(runner);await migration.up(runner);const supplyMigration=new AddReservationsAndProcurement1791676800004();await supplyMigration.up(runner);await supplyMigration.down(runner);await supplyMigration.up(runner);const productionMigration=new AddProductionPlanning1791763200005();await productionMigration.up(runner);await productionMigration.down(runner);await productionMigration.up(runner);const hardening=new HardenProductionReconciliation1791763200006();await hardening.up(runner);await hardening.down(runner);await hardening.up(runner);const packing=new AddPacking1791849600007();await packing.up(runner);await packing.down(runner);await packing.up(runner);const readiness=new HardenPackingReadiness1791936000008();await readiness.up(runner);await readiness.down(runner);await readiness.up(runner);const delivery=new AddDeliveryCustody1792022400009();await delivery.up(runner);await delivery.down(runner);await delivery.up(runner);const completion=new AddProjectCompletion1792108800010();await completion.up(runner);await completion.down(runner);await completion.up(runner);const attachments=new AddPrivateAttachments1792195200011();await attachments.up(runner);await attachments.down(runner);await attachments.up(runner);const layouts=new AddSharedLabelLayouts1792281600012();await layouts.up(runner);await layouts.down(runner);await layouts.up(runner);await runner.commitTransaction();}catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();await bootstrap.destroy();}
    db=new DataSource(options);await db.initialize();const a=await db.getRepository(Organization).save({name:schema});const b=await db.getRepository(Organization).save({name:schema+"other"});
    const user=(name:string,role:string,org=a.id)=>db.getRepository(User).save({name,email:name+"@test.invalid",role,organization_id:org,firebase_uid:null});
    maker=await user("Counter","staff");admin=await user("Approver","admin");viewer=await user("Reader","viewer");other=await user("Other","admin",b.id);
    wire=await db.getRepository(InventoryItem).save({organization_id:a.id,name:"Preserved wire",description:"Preserved description",sku:"WIRE",unit:"m",quantity:987,base_price:123,threshold:0});
    unknown=await db.getRepository(InventoryItem).save({organization_id:a.id,name:"Uncounted item",sku:"UNKNOWN",unit:"m",quantity:456,base_price:99,threshold:0});
    // Historical ledger is intentionally excluded from physical truth.
    await db.query(`INSERT INTO stock_ledger(organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type) VALUES($1,$2,'Preserved wire','WIRE',987,987,123,'INITIAL_BALANCE')`,[a.id,wire.id]);
    finished=await db.getRepository(InventoryItem).save({organization_id:a.id,name:"Synthetic laser parts",sku:"PARTS",unit:"m",quantity:777,base_price:42,threshold:0});baseline=JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"));await start();
  },30000);
  afterAll(async()=>{if(server)await close();if(db?.isInitialized)await db.destroy();});
  async function prod(method:string,path:string,body?:unknown,status=200,u=maker,key=randomUUID()) {
    const r=await fetch(base+"/api/v1/packing"+path,{method,headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":key},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const t=await r.text();expect(r.status,t).toBe(status);return t?JSON.parse(t):null;
  }
  const balance=async()=>Number((await db.query("SELECT COALESCE(SUM(qty_delta),0)::text q FROM stock_ledger WHERE item_id=$1 AND verification_entry_id IS NOT NULL",[wire.id]))[0].q);
  const schoolOrders: import("../../features/packing/packingTypes").PackingOrder[]=[];
  async function supply(path:string,body:unknown,status=201,u=maker){const r=await fetch(base+"/api/v1/supply-planning"+path,{method:"POST",headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify(body)});const t=await r.text();expect(r.status,t).toBe(status);return JSON.parse(t);}
  let order: import("../../features/packing/packingTypes").PackingOrder;
  it("round-trips the empty migration and establishes synthetic physical truth",async()=>{
    let s=await create([target(wire,["Shelf A"])]);s=await count(s,"20");s=await step(s,"review",{reason:"Complete count"});s=await step(s,"approve");await step(s,"post");expect(await balance()).toBe(20);
  });
  it("enforces current-user permissions, tenant ownership and strict inputs",async()=>{
    await request("GET","/packing",undefined,undefined,401);
    await prod("POST","/orders",{batch_code:"TEST",manual:{name:"Kit",materials:[{item_id:wire.id,quantity:"2",unit:"m"}]}},403,viewer);
    await request("POST","/packing/orders",viewer,{},403,{role:"admin"});
    await prod("POST","/orders",{batch_code:"TEST",manual:{name:"Kit",materials:[{item_id:wire.id,quantity:"2",unit:"m"}]}},404,other);
    await prod("POST","/orders",{batch_code:"TEST",organization_id:other.organization_id},400);
    order=await prod("POST","/orders",{batch_code:"TEST",manual:{name:"Kit",materials:[{item_id:wire.id,quantity:"2",unit:"m"}]}},201);
    await prod("GET",`/orders/${order.id}`,undefined,404,other);
    await prod("POST",`/orders/${order.id}/release`,{revision:order.revision},403);
    order=await prod("POST",`/orders/${order.id}/release`,{revision:order.revision},200,admin);
  });
  it("posts one ledger decrement for concurrent retries and rejects over-picking",async()=>{
    const key=randomUUID(),body={revision:order.revision,item_id:wire.id,quantity:"1",unit:"m",location:"Shelf A"};
    const results=await Promise.all([prod("POST",`/orders/${order.id}/picks`,body,201,maker,key),prod("POST",`/orders/${order.id}/picks`,body,201,maker,key)]);
    expect(results[0]).toEqual(results[1]);order=results[0];expect(await balance()).toBe(19);
    await prod("POST",`/orders/${order.id}/picks`,{...body,quantity:"2"},409,maker,key);
    await prod("POST",`/orders/${order.id}/picks`,{...body,revision:order.revision,quantity:"2"},409);
    const d=await prod("GET",`/orders/${order.id}`);expect(d.picks).toHaveLength(1);expect(d.materials[0].remaining).toBe("1.0000");expect(d.picks[0].source_movements).toHaveLength(1);
    await prod("POST",`/orders/${order.id}/cancel`,{revision:order.revision},409);
    await expect(db.query("UPDATE packing_picks SET quantity=2 WHERE order_id=$1",[order.id])).rejects.toThrow();
    await expect(db.query("UPDATE packing_orders SET snapshot='{}' WHERE id=$1",[order.id])).rejects.toThrow();
  });
  it("retains school-specific crate counts, version identity and packing history",async()=>{
    const f=planningFixture(wire.id);const draft=await request("POST","/product-templates",maker,{name:"Packing demand",subjects:f.subjects},201);
    const v=await request("POST",`/product-templates/${draft.template_id}/approve`,maker,{revision:1},201);
    for(const site of f.content.sites)site.selections[0].version_id=v.id;
    const project=await request("POST","/planning-projects",maker,f.content,201);projectId=project.id;
    for(const [i,site] of project.sites.entries()){
      const o=await prod("POST","/orders",{batch_code:`SCHOOL-${i}`,project_id:project.id,site_id:site.id,demand_revision:project.revision},201);
      schoolOrders.push(o);
      expect(o.snapshot.packages.filter((p: {kind:string})=>p.kind==="common_crate")).toHaveLength(i===0?6:3);
      expect(o.snapshot.packages.filter((p: {kind:string})=>p.kind==="universal_crate")).toHaveLength(i===0?2:0);
      expect(o.snapshot.packages.every((p: {version_id:string})=>p.version_id===v.id)).toBe(true);
      await prod("POST","/orders",{batch_code:"DUPLICATE",project_id:project.id,site_id:site.id,demand_revision:project.revision},409);
    }
    await request("POST",`/planning-projects/${project.id}/archive`,maker,{revision:project.revision},409);
    const removed={...f.content,sites:[]};await request("PUT",`/planning-projects/${project.id}`,maker,{...removed,revision:project.revision},409);
  });
  it("transfers school reservations once and credits project demand without a second movement",async()=>{
    let o=schoolOrders[0];const before=await balance();
    const r=await supply("/reservations",{project_id:o.project_id,site_id:o.site_id,item_id:wire.id,quantity:"2.4",unit:"m"});
    expect(await balance()).toBe(before);
    await supply(`/reservations/${r.id}/fulfill`,{revision:r.revision,reason:"Legacy transfer",location:"Shelf A"},409,admin);
    o=await prod("POST",`/orders/${o.id}/release`,{revision:o.revision},200,admin);
    await prod("POST",`/orders/${o.id}/picks`,{revision:o.revision,item_id:wire.id,quantity:"1",unit:"m",location:"Shelf A",reservation_id:r.id},404,other);
    o=await prod("POST",`/orders/${o.id}/picks`,{revision:o.revision,item_id:wire.id,quantity:"1",unit:"m",location:"Shelf A",reservation_id:r.id},201);
    const partial=(await db.query("SELECT * FROM project_stock_reservations WHERE id=$1",[r.id]))[0];expect(partial.quantity).toBe("1.4000");expect(partial.status).toBe("active");
    o=await prod("POST",`/orders/${o.id}/picks`,{revision:o.revision,item_id:wire.id,quantity:"1.4",unit:"m",location:"Shelf A",reservation_id:r.id},201);
    expect((await db.query("SELECT status FROM project_stock_reservations WHERE id=$1",[r.id]))[0].status).toBe("released");
    expect(await balance()).toBe(before-2.4);
    const preview=await request("POST",`/planning-projects/${o.project_id}/preview`,maker,{revision:o.demand_revision});expect(preview.materials[0].fulfilled_quantity).toBe(2.4);
    await close();await start();const restored=await prod("GET",`/orders/${o.id}`);expect(restored.picks).toHaveLength(2);expect(restored.materials[0].remaining).toBe("0.0000");
    await prod("POST",`/orders/${o.id}/picks`,{revision:o.revision,item_id:wire.id,quantity:"0.1",unit:"m",location:"Shelf A"},409);
  });
  it("refuses to repick a school whose stock was already fulfilled",async()=>{
    const f=planningFixture(wire.id);const draft=await request("POST","/product-templates",maker,{name:"Historical fulfillment",subjects:f.subjects},201);
    const v=await request("POST",`/product-templates/${draft.template_id}/approve`,maker,{revision:1},201);for(const site of f.content.sites)site.selections[0].version_id=v.id;
    const project=await request("POST","/planning-projects",maker,f.content,201),site=project.sites[0];
    const r=await supply("/reservations",{project_id:project.id,site_id:site.id,item_id:wire.id,quantity:"0.5",unit:"m"});
    const before=await balance();await supply(`/reservations/${r.id}/fulfill`,{revision:r.revision,reason:"Existing stock transfer",location:"Shelf A"},200,admin);
    await prod("POST","/orders",{batch_code:"NO-REPICK",project_id:project.id,site_id:site.id,demand_revision:project.revision},409);
    expect(await balance()).toBe(before-0.5);
  });
  it("persists assignments and partial checklists with tenant and revision protection",async()=>{
    order=await prod("POST",`/orders/${order.id}/assign`,{revision:order.revision,team:"Assembly",employee_id:maker.id});
    expect(order.assigned_employee_id).toBe(maker.id);
    await prod("POST",`/orders/${order.id}/assign`,{revision:order.revision,employee_id:other.id},404);
    await prod("POST",`/orders/${order.id}/assign`,{revision:order.revision,team:"Forbidden"},403,viewer);
    const ids=order.snapshot.packages.map((p:{id:string})=>p.id);
    await prod("POST",`/orders/${order.id}/checklist`,{revision:order.revision,package_ids:ids,assembled:true},409);
    await prod("POST",`/orders/${order.id}/checklist`,{revision:order.revision,package_ids:[],assembled:true},400);
    await expect(db.query("UPDATE packing_orders SET status='ready',revision=revision+1 WHERE id=$1",[order.id])).rejects.toThrow();
    const d=await prod("GET",`/orders/${schoolOrders[0].id}`);schoolOrders[0]=d.order;
    const leaf=d.order.snapshot.packages.find((p:{id:string;parent_id:string|null})=>!d.order.snapshot.packages.some((c:{parent_id:string|null})=>c.parent_id===p.id));
    schoolOrders[0]=await prod("POST",`/orders/${d.order.id}/checklist`,{revision:d.order.revision,package_ids:[leaf.id],assembled:true});
    expect(Object.values(schoolOrders[0].execution.progress).filter((p:any)=>p.assembled)).toHaveLength(1);
    await prod("POST",`/orders/${d.order.id}/checklist`,{revision:d.order.revision,package_ids:[leaf.id],assembled:true},409);
    await close();await start();expect((await prod("GET",`/orders/${order.id}`)).order.assigned_team).toBe("Assembly");
  });
  it("blocks shortages and rejected QC, corrects exceptions and reinspects without stock movements",async()=>{
    let o=schoolOrders[0];const ids=o.snapshot.packages.map(p=>p.id),leaf=o.snapshot.packages.find(p=>!o.snapshot.packages.some(c=>c.parent_id===p.id))!;
    const before=await balance(),ledgerBefore=(await db.query("SELECT count(*) n FROM stock_ledger"))[0].n;
    o=await prod("POST",`/orders/${o.id}/exceptions`,{revision:o.revision,package_id:leaf.id,kind:"missing",notes:"Pouch missing during assembly"});
    const exception=o.execution.exceptions[0];
    await prod("POST",`/orders/${o.id}/checklist`,{revision:o.revision,package_ids:ids,assembled:true},409);
    o=await prod("POST",`/orders/${o.id}/exceptions`,{revision:o.revision,package_id:leaf.id,kind:"missing",notes:"Located issued pouch in WIP",exception_id:exception.id});
    const body={revision:o.revision,package_ids:ids,assembled:true},key=randomUUID();
    const retries=await Promise.all([prod("POST",`/orders/${o.id}/checklist`,body,200,maker,key),prod("POST",`/orders/${o.id}/checklist`,body,200,maker,key)]);expect(retries[0]).toEqual(retries[1]);o=retries[0];
    const checks={material:true,quantity:true,placement:true,packaging:true,stickers:true,instructions:true};
    await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"accept",checks},403);
    await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"accept",checks:{...checks,stickers:false}},409,admin);
    await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"accept",checks:{material:true}},400,admin);
    o=await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"reject",checks:{...checks,packaging:false},notes:"Damaged seal"},200,admin);
    expect(o.status).toBe("packing");expect(o.execution.progress[leaf.id].qc).toBe("rejected");
    await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:[ids[0]],decision:"accept",checks},409,admin);
    o=await prod("POST",`/orders/${o.id}/checklist`,{revision:o.revision,package_ids:ids,assembled:true,notes:"Seal replaced and contents rechecked"});
    const qcBody={revision:o.revision,package_ids:ids,decision:"accept",checks},qcKey=randomUUID();
    const accepted=await Promise.all([prod("POST",`/orders/${o.id}/qc`,qcBody,200,admin,qcKey),prod("POST",`/orders/${o.id}/qc`,qcBody,200,admin,qcKey)]);expect(accepted[0]).toEqual(accepted[1]);o=accepted[0];expect(o.status).toBe("ready");
    expect(o.execution.exceptions[0].corrected_by).toBe(maker.id);expect(Object.values(o.execution.progress).every((p:any)=>p.checked_by===admin.id)).toBe(true);
    expect(await balance()).toBe(before);expect((await db.query("SELECT count(*) n FROM stock_ledger"))[0].n).toBe(ledgerBefore);
    await prod("POST",`/orders/${o.id}/checklist`,{revision:o.revision,package_ids:ids,assembled:false},409);
    await prod("POST",`/orders/${o.id}/reopen`,{revision:o.revision,reason:"Reinspection"},403);
    o=await prod("POST",`/orders/${o.id}/reopen`,{revision:o.revision,reason:"Supervisor reinspection"},200,admin);expect(o.status).toBe("packing");
    o=await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"accept",checks},200,admin);schoolOrders[0]=o;
    await close();await start();expect((await prod("GET",`/orders/${o.id}`)).order.status).toBe("ready");
  });
  it("completes School B only after picking, assembly and authorized QC",async()=>{
    let o=schoolOrders[1];const ids=o.snapshot.packages.map(p=>p.id),before=await balance();
    o=await prod("POST",`/orders/${o.id}/release`,{revision:o.revision},200,admin);
    await prod("POST",`/orders/${o.id}/checklist`,{revision:o.revision,package_ids:ids,assembled:true},409);
    const detail=await prod("GET",`/orders/${o.id}`);expect(detail.materials[0].planned).toBe("0.9000");
    o=await prod("POST",`/orders/${o.id}/picks`,{revision:o.revision,item_id:wire.id,quantity:"0.9",unit:"m",location:"Shelf A"},201);
    o=await prod("POST",`/orders/${o.id}/checklist`,{revision:o.revision,package_ids:ids,assembled:true});expect(o.status).toBe("packing");
    o=await prod("POST",`/orders/${o.id}/qc`,{revision:o.revision,package_ids:ids,decision:"accept",checks:{material:true,quantity:true,placement:true,packaging:true,stickers:true,instructions:true}},200,admin);
    expect(o.status).toBe("ready");schoolOrders[1]=o;expect(await balance()).toBeCloseTo(before-0.9);
    const detailAfter=await prod("GET",`/orders/${o.id}`);expect(detailAfter.materials[0].completed).toBe("0.9000");expect(detailAfter.history.length).toBeGreaterThan(4);
  });
  const deliveryOrders: import("../../features/delivery/deliveryTypes").DeliveryOrder[]=[];
  async function deliver(method:string,path:string,body?:unknown,status=200,u=admin,key=randomUUID()) {
    const r=await fetch(base+"/api/v1/delivery"+path,{method,headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":key},...(body===undefined?{}:{body:JSON.stringify(body)})});const t=await r.text();expect(r.status,t).toBe(status);return t?JSON.parse(t):null;
  }
  it("allocates School A in two batches and School B once, guards duplicate claims and tenant access",async()=>{
    const before=await balance(),ledger=(await db.query("SELECT count(*) n FROM stock_ledger"))[0].n;
    await deliver("POST","/orders",{packing_order_id:order.id,package_ids:order.snapshot.packages.map(p=>p.id),transport:{carrier:"Synthetic carrier",planned_date:new Date().toISOString()}},409);
    for(const school of schoolOrders){
      const roots=school.snapshot.packages.filter(p=>p.kind==="kit");
      const batches=school===schoolOrders[0]?[roots.slice(0,1),roots.slice(1)]:[roots];
      for(const batch of batches){const body={packing_order_id:school.id,package_ids:batch.map(p=>p.id),transport:{carrier:"Synthetic carrier",vehicle:"TEST",planned_date:new Date().toISOString(),employee_id:maker.id}};
        await deliver("POST","/orders",body,403,maker);
        const key=randomUUID(),both=await Promise.all([deliver("POST","/orders",body,201,admin,key),deliver("POST","/orders",body,201,admin,key)]);expect(both[0]).toEqual(both[1]);deliveryOrders.push(both[0]);
        await deliver("POST","/orders",body,409);
        await deliver("GET",`/orders/${both[0].id}`,undefined,404,other);
        await deliver("POST",`/orders/${both[0].id}/dispatch`,{revision:both[0].revision},403,viewer);
      }
      await prod("POST",`/orders/${school.id}/reopen`,{revision:school.revision,reason:"Cannot alter allocated packages"},409,admin);
    }
    expect(deliveryOrders).toHaveLength(3);expect(await balance()).toBe(before);expect((await db.query("SELECT count(*) n FROM stock_ledger"))[0].n).toBe(ledger);
  });
  it("records partial proof, failure, quarantined return, correction and retry exactly once without stock receipts",async()=>{
    const before=await balance(),ledger=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));
    for(let index=0;index<deliveryOrders.length;index++){
      let o=deliveryOrders[index];const key=randomUUID(),body={revision:o.revision};
      const both=await Promise.all([deliver("POST",`/orders/${o.id}/dispatch`,body,200,admin,key),deliver("POST",`/orders/${o.id}/dispatch`,body,200,admin,key)]);expect(both[0]).toEqual(both[1]);o=both[0];
      await deliver("POST",`/orders/${o.id}/transit`,body,409);o=await deliver("POST",`/orders/${o.id}/transit`,{revision:o.revision});
      if(index===0){
        o=await deliver("POST",`/orders/${o.id}/issues`,{revision:o.revision,package_id:o.manifest[0].id,kind:"damaged",notes:"Transport seal damaged"},200,maker);
        o=await deliver("POST",`/orders/${o.id}/fail`,{revision:o.revision,reason:"Receiver declined damaged seal"});
        o=await deliver("POST",`/orders/${o.id}/return`,{revision:o.revision,reason:"Physical package held in return quarantine"});
        await deliver("POST",`/orders/${o.id}/retry`,{revision:o.revision,reason:"Retry"},409);
        await deliver("POST",`/orders/${o.id}/issues`,{revision:o.revision,package_id:o.manifest[0].id,kind:"damaged",notes:"Repaired",issue_id:o.execution.issues[0].id},403,maker);
        o=await deliver("POST",`/orders/${o.id}/issues`,{revision:o.revision,package_id:o.manifest[0].id,kind:"damaged",notes:"Seal corrected and contents rechecked",issue_id:o.execution.issues[0].id});
        o=await deliver("POST",`/orders/${o.id}/retry`,{revision:o.revision,reason:"Supervisor verified correction"});
      }
      const proof={revision:o.revision,package_ids:[o.manifest[0].id],recipient:"Synthetic school recipient",acknowledged_at:new Date().toISOString(),acknowledgement:"Package physically received"};
      await deliver("POST",`/orders/${o.id}/receive`,{...proof,recipient:" "},400,maker);
      const receiptKey=randomUUID(),receipts=await Promise.all([deliver("POST",`/orders/${o.id}/receive`,proof,200,maker,receiptKey),deliver("POST",`/orders/${o.id}/receive`,proof,200,maker,receiptKey)]);expect(receipts[0]).toEqual(receipts[1]);o=receipts[0];expect(o.status).toBe("partially_delivered");
      await deliver("POST",`/orders/${o.id}/receive`,{...proof,revision:o.revision},409,maker);
      o=await deliver("POST",`/orders/${o.id}/receive`,{...proof,revision:o.revision,package_ids:o.manifest.slice(1).map(p=>p.id)},200,maker);expect(o.status).toBe("delivered");deliveryOrders[index]=o;
      const detail=await deliver("GET",`/orders/${o.id}`,undefined,200,viewer);expect(detail.custody.filter((e:import("../../features/delivery/deliveryTypes").CustodyEvent)=>e.state==="delivered")).toHaveLength(o.manifest.length);
      expect(detail.custody.every((e:import("../../features/delivery/deliveryTypes").CustodyEvent)=>e.pick_ledger_ids.length>0)).toBe(true);
    }
    await close();await start();expect((await deliver("GET",`/orders/${deliveryOrders[0].id}`)).order.status).toBe("delivered");
    expect(await balance()).toBe(before);expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(ledger);
    const runner=db.createQueryRunner();await runner.connect();await expect(new AddDeliveryCustody1792022400009().down(runner)).rejects.toThrow("Delivery history exists");await runner.release();
  });
  it("requires installer completion, correction, authorized sign-off and customer acceptance before closing all schools",async()=>{
    const before=await balance(),ledger=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));
    const progressPath=`/projects/${projectId}`;
    let progress:import("../../features/delivery/completionTypes").CompletionProgress=await deliver("GET",progressPath);
    expect(progress.schools.map(s=>s.remaining)).toEqual([0,0]);expect(progress.blockers).toEqual([]);
    const site=progress.schools[0],task=randomUUID();
    const config={project_id:projectId,site_id:site.site_id,required:true,employee_id:maker.id,survey:"Synthetic site power and access checked",checklist:[{id:task,label:"Set up and demonstrate science kits",required:true}]};
    await deliver("POST","/installations",config,403,maker);
    await deliver("POST","/installations",{...config,employee_id:other.id},404);
    let job:import("../../features/delivery/completionTypes").InstallationJob=await deliver("POST","/installations",config,201);
    await deliver("POST","/installations",config,409);
    await deliver("GET",progressPath,undefined,404,other);
    const closeBody={revision:0,project_revision:progress.project_revision,action:"close",recipient:"Synthetic customer",notes:"All schools acknowledged"};
    await deliver("POST",`${progressPath}/completion`,closeBody,409);
    await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"finish"},409,maker);
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"issue",notes:"Mounting position needs correction"},200,maker);expect(job.status).toBe("blocked");
    await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"correct",issue_id:job.issues[0].id,notes:"Fixed"},403,maker);
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"correct",issue_id:job.issues[0].id,notes:"Mounting position corrected and inspected"});
    const check={revision:job.revision,action:"check",task_id:task,checked:true},key=randomUUID();
    const checked=await Promise.all([deliver("POST",`/installations/${job.id}`,check,200,maker,key),deliver("POST",`/installations/${job.id}`,check,200,maker,key)]);expect(checked[0]).toEqual(checked[1]);job=checked[0];
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"finish"},200,maker);expect(job.status).toBe("installed");
    await deliver("POST",`${progressPath}/completion`,closeBody,409);
    await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"accept",recipient:"School representative",notes:"Setup accepted"},403,maker);
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"accept",recipient:"School representative",notes:"Setup accepted"});expect(job.status).toBe("completed");
    progress=await deliver("GET",progressPath);expect(progress.blockers).toEqual([]);expect(progress.schools[1].installation).toBeNull();
    await deliver("POST",`${progressPath}/completion`,closeBody,403,maker);
    await deliver("POST",`${progressPath}/completion`,{...closeBody,recipient:" "},400);
    const closeKey=randomUUID(),closed=await Promise.all([deliver("POST",`${progressPath}/completion`,closeBody,200,admin,closeKey),deliver("POST",`${progressPath}/completion`,closeBody,200,admin,closeKey)]);expect(closed[0]).toEqual(closed[1]);expect(closed[0].status).toBe("closed");
    await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"reopen",notes:"Revisit"},409);
    const schoolOrder=deliveryOrders[0];await deliver("POST",`/orders/${schoolOrder.id}/issues`,{revision:schoolOrder.revision,package_id:schoolOrder.manifest[0].id,kind:"missing",notes:"Late discrepancy"},409);
    await expect(db.query("UPDATE planning_projects SET revision=revision+1 WHERE id=$1",[projectId])).rejects.toThrow("Reopen closed project");
    await deliver("POST",`${progressPath}/completion`,{revision:closed[0].revision,project_revision:progress.project_revision,action:"reopen",notes:"Authorized site revisit"});
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"reopen",notes:"Authorized site revisit"});
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"finish"},200,maker);
    job=await deliver("POST",`/installations/${job.id}`,{revision:job.revision,action:"accept",recipient:"School representative",notes:"Reinspection accepted"});
    progress=await deliver("GET",progressPath);await deliver("POST",`${progressPath}/completion`,{...closeBody,revision:progress.completion!.revision});
    await close();await start();progress=await deliver("GET",progressPath);expect(progress.completion?.status).toBe("closed");expect(progress.history.filter(h=>h.kind==="project_completion")).toHaveLength(3);
    await expect(db.query("DELETE FROM supply_events WHERE kind='installation'")).rejects.toThrow();
    await expect(db.query("UPDATE package_custody_events SET notes='rewrite'")).rejects.toThrow("immutable");
    const runner=db.createQueryRunner();await expect(new AddProjectCompletion1792108800010().down(runner)).rejects.toThrow("Lifecycle history exists");await runner.release();
    expect(await balance()).toBe(before);expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(ledger);
  });
  it("records explicit authorized closure exceptions without fabricating delivered packages",async()=>{
    const f=planningFixture(wire.id);const t=await request("POST","/product-templates",maker,{name:"Synthetic incomplete project",subjects:f.subjects},201);const published=await request("POST",`/product-templates/${t.template_id}/approve`,maker,{revision:1},201);
    f.content.sites[0].selections[0].version_id=published.id;f.content.sites=f.content.sites.slice(0,1);
    const project=await request("POST","/planning-projects",maker,f.content,201);
    const body={revision:0,project_revision:project.revision,action:"close",recipient:"Synthetic customer",notes:"Customer requests closure despite pending shipment"};
    await deliver("POST",`/projects/${project.id}/completion`,body,409);
    await deliver("POST",`/projects/${project.id}/completion`,{...body,exception_reason:"Authorized cancellation of remaining delivery"},403,maker);
    const result=await deliver("POST",`/projects/${project.id}/completion`,{...body,exception_reason:"Authorized cancellation of remaining delivery"});expect(result.exception.blockers.length).toBeGreaterThan(0);
    const progress=await deliver("GET",`/projects/${project.id}`);expect(progress.schools[0].delivered).toBe(0);expect(progress.blockers.length).toBeGreaterThan(0);
  });
  it("prints and reprints traceable labels without package or ledger writes and isolates QR access",async()=>{
    const before=await balance(),ledger=(await db.query("SELECT count(*) n FROM stock_ledger"))[0].n;
    const ordersBefore=JSON.stringify(await db.query("SELECT * FROM packing_orders ORDER BY id"));
    for(const o of schoolOrders){
      const ids=o.snapshot.packages.map(p=>p.id);
      const pdf=await packingLabelPDF(o,ids,"https://erp.test.invalid");expect(pdf.getNumberOfPages()).toBe(ids.length);
      const reprint=await packingLabelPDF(o,ids,"https://erp.test.invalid");expect(reprint.getNumberOfPages()).toBe(ids.length);
      for(const p of o.snapshot.packages){const d=await prod("GET",`/packages/${p.id}`,undefined,200,viewer);expect(d.package).toEqual(p);expect(d.school).toBe(o.snapshot.site_name);expect(d.requirement_revision).toBe(o.demand_revision);expect(d.progress.qc).toBe("accepted");expect(d.status).toBe("ready");expect(new URL(packageDestination("https://erp.test.invalid",p.id)).searchParams.get("packing_package")).toBe(p.id);if(p.kind!=="batch"){expect(d.custody.length).toBeGreaterThan(0);expect(d.custody.at(-1).state).toBe("delivered");expect(d.custody.every((e:{package_id:string;pick_ledger_ids:string[]})=>e.package_id===p.id&&e.pick_ledger_ids.length>0)).toBe(true);}}
    }
    const id=schoolOrders[0].snapshot.packages[0].id;
    await request("GET",`/packing/packages/${id}`,undefined,undefined,401);
    await prod("GET",`/packages/${id}`,undefined,404,other);
    await request("GET",`/packing/packages/${id}`,other,undefined,403,{orgId:maker.organization_id,role:"admin"});
    await prod("GET","/packages/not-a-uuid",undefined,400);
    await prod("GET",`/packages/${randomUUID()}`,undefined,404);
    expect(JSON.stringify(await db.query("SELECT * FROM packing_orders ORDER BY id"))).toBe(ordersBefore);
    expect(await balance()).toBe(before);expect((await db.query("SELECT count(*) n FROM stock_ledger"))[0].n).toBe(ledger);
  });
  it("persists private attachments with authenticated isolation, audit and safe replay",async()=>{
    const p=await request("POST","/planning-projects",maker,{name:"Synthetic attachment project",client:"Synthetic",notes:"",commercial_links:[],overrides:{},sites:[]},201);
    const bytes=Buffer.from("Synthetic private survey"),key=randomUUID(),ledgerBefore=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));
    async function upload(u:User|undefined,filename="survey.txt",body=bytes,k=key,claims={}){
      return fetch(base+`/api/v1/attachments/projects/${p.id}`,{method:"POST",headers:{...(u?{Authorization:`Bearer ${token(u,claims)}`}:{ }),"Content-Type":"text/plain","X-Attachment-Name":filename,"Idempotency-Key":k},body});
    }
    expect((await upload(undefined)).status).toBe(401);expect((await upload(viewer,"survey.txt",bytes,key,{role:"admin"})).status).toBe(403);expect((await upload(other)).status).toBe(404);
    expect((await upload(maker,"../escape.txt")).status).toBe(400);expect((await upload(maker,"survey.html")).status).toBe(400);
    const responses=await Promise.all([upload(maker),upload(maker)]);expect(responses.map(r=>r.status)).toEqual([201,201]);
    const a=await responses[0].json(),b=await responses[1].json();expect(a.id).toBe(b.id);
    expect((await upload(maker,"survey.txt",Buffer.from("changed"))).status).toBe(409);
    expect(await request("GET",`/attachments/projects/${p.id}`,viewer)).toHaveLength(1);
    await request("GET",`/attachments/${a.id}/download`,other,undefined,404);await request("GET",`/attachments/${a.id}/download`,undefined,undefined,401);
    const download=await fetch(base+`/api/v1/attachments/${a.id}/download`,{headers:{Authorization:`Bearer ${token(viewer)}`}});
    expect(download.status).toBe(200);expect(download.headers.get("content-disposition")).toContain("attachment");expect(download.headers.get("cache-control")).toContain("no-store");expect(Buffer.from(await download.arrayBuffer())).toEqual(bytes);
    expect((await db.query("SELECT action FROM private_attachment_events WHERE attachment_id=$1 ORDER BY created_at",[a.id])).map((e:{action:string})=>e.action)).toEqual(["upload","download"]);
    await close();await db.destroy();await db.initialize();await start();expect(await request("GET",`/attachments/projects/${p.id}`,maker)).toHaveLength(1);
    const runner=db.createQueryRunner();try{await expect(new AddPrivateAttachments1792195200011().down(runner)).rejects.toThrow("populated");}finally{await runner.release();}
    expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(ledgerBefore);
  });
  it("shares immutable label layout revisions without package or ledger writes",async()=>{
    const path="/packing-label-layouts",layout={width:110,height:85,fontSize:10,materials:false};
    const ledger=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));
    await request("GET",path,undefined,undefined,401);
    expect((await request("GET",path,viewer)).revision).toBe(0);
    await request("POST",path,viewer,{expectedRevision:0,template:layout},403);await request("POST",path,maker,{expectedRevision:0,template:layout},403,{role:"admin"});
    const key=randomUUID(),save=(template=layout,expectedRevision=0,k=key,u=admin)=>fetch(base+`/api/v1${path}`,{method:"POST",headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":k},body:JSON.stringify({expectedRevision,template})});
    const saved=await Promise.all([save(),save()]);expect(saved.map(r=>r.status)).toEqual([201,201]);
    const results=await Promise.all(saved.map(r=>r.json()));expect(results[0].revision).toBe(1);expect(results[1].revision).toBe(1);
    expect((await request("GET",path,viewer)).template).toEqual(layout);
    expect((await request("GET",path,other)).revision).toBe(0);
    expect((await save({...layout,width:120})).status).toBe(409);
    expect((await save(layout,0,randomUUID())).status).toBe(409);
    expect((await save({...layout,width:1},1,randomUUID())).status).toBe(400);
    expect((await save({...layout,width:120},1,randomUUID())).status).toBe(201);
    expect(await request("GET",path+"/history",viewer)).toHaveLength(2);
    await expect(db.query("UPDATE organization_label_layouts SET revision=3 WHERE organization_id=$1",[maker.organization_id])).rejects.toThrow();
    await close();await db.destroy();await db.initialize();await start();expect((await request("GET",path,viewer)).revision).toBe(2);
    const runner=db.createQueryRunner();try{await expect(new AddSharedLabelLayouts1792281600012().down(runner)).rejects.toThrow("populated");}finally{await runner.release();}
    expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(ledger);
  });
  it("refuses destructive rollback and preserves inventory and historical ledger",async()=>{
    const r=db.createQueryRunner();try{await expect(new AddPacking1791849600007().down(r)).rejects.toThrow("history");}finally{await r.release();}
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
    expect(Number((await db.query("SELECT qty_delta FROM stock_ledger WHERE verification_entry_id IS NULL AND item_id=$1",[wire.id]))[0].qty_delta)).toBe(987);
    const unmatched=await db.query("SELECT p.id FROM packing_picks p LEFT JOIN stock_ledger l ON l.id=p.ledger_id AND l.packing_pick_id=p.id AND l.organization_id=p.organization_id AND l.qty_delta=-p.quantity WHERE l.id IS NULL");expect(unmatched).toHaveLength(0);
    const orphaned=await db.query("SELECT l.id FROM stock_ledger l LEFT JOIN packing_picks p ON p.id=l.packing_pick_id AND p.ledger_id=l.id AND p.organization_id=l.organization_id WHERE l.packing_pick_id IS NOT NULL AND p.id IS NULL");expect(orphaned).toHaveLength(0);
    expect(await balance()).toBeCloseTo(15.2);
    expect(schoolOrders.map(o=>o.status)).toEqual(["ready","ready"]);
  });
});
