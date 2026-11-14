import {HardenProductionReconciliation1791763200006} from "../../migration/1791763200006-HardenProductionReconciliation";
import {productionPlanningRouter} from "../v1/production-planning";
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
describe.skipIf(!url)("PostgreSQL production acceptance",()=>{
  let db:DataSource;let server:Server;let base:string;let maker:User;let admin:User;let viewer:User;let other:User;
  let wire:InventoryItem;let finished:InventoryItem;let unknown:InventoryItem;let session:Stocktake;let baseline:string;let projectId:string;
  const schema=`production_test_${randomUUID().replaceAll("-","")}`;
  const token=(u:User,claims={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...claims},env.jwtSecret,{expiresIn:"10m"});
  async function request(method:string,path:string,u?:User,body?:unknown,expected=200,claims={}) {
    const r=await fetch(base+"/api/v1"+path,{method,headers:{"Content-Type":"application/json",...(u?{Authorization:`Bearer ${token(u,claims)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await r.text();expect(r.status,text).toBe(expected);return text?JSON.parse(text):null;
  }
  async function start(){const app=express();app.use(express.json());app.use("/api/v1/production-planning",productionPlanningRouter(db));app.use("/api/v1/supply-planning",supplyPlanningRouter(db));app.use("/api/v1/stocktakes",stocktakeRouter(db));app.use("/api/v1/product-templates",productTemplateRouter(db));app.use("/api/v1/planning-projects",planningProjectRouter(db));server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});const a=server.address();if(!a||typeof a==="string")throw new Error("Missing port");base=`http://127.0.0.1:${a.port}`;}
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
    const bootstrap=new DataSource({...options,entities:(options.entities as Function[]).filter(e=>![ProductTemplate,ProductTemplateVersion,ProductTemplateRevision,...planningEntities,...stocktakeEntities,...supplyEntities,...productionEntities,...commitmentEntities].includes(e as typeof ProductTemplate))});
    await bootstrap.initialize();await bootstrap.synchronize();const runner=bootstrap.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{await new AddProductTemplates1791417600000().up(runner);await new AddKitSubjectsAndGrades1791417600001().up(runner);await new AddProjectPlanning1791417600002().up(runner);const migration=new AddPhysicalStocktake1791504000003();await migration.up(runner);await migration.down(runner);await migration.up(runner);const supplyMigration=new AddReservationsAndProcurement1791676800004();await supplyMigration.up(runner);await supplyMigration.down(runner);await supplyMigration.up(runner);const productionMigration=new AddProductionPlanning1791763200005();await productionMigration.up(runner);await productionMigration.down(runner);await productionMigration.up(runner);const hardening=new HardenProductionReconciliation1791763200006();await hardening.up(runner);await hardening.down(runner);await hardening.up(runner);await runner.commitTransaction();}catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();await bootstrap.destroy();}
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
    const r=await fetch(base+"/api/v1/production-planning"+path,{method,headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":key},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const t=await r.text();expect(r.status,t).toBe(status);return t?JSON.parse(t):null;
  }
  const definition=()=>({output_item_id:finished.id,yield_quantity:"2",unit:"m",inputs:[{item_id:wire.id,quantity:"2",unit:"m",scrap_percent:"10"}],instructions:"Synthetic laser preparation",specification:"MDF model",concentration:""});
  const balance=async(item=wire)=>Number((await db.query("SELECT COALESCE(SUM(qty_delta),0)::text q FROM stock_ledger WHERE item_id=$1 AND verification_entry_id IS NOT NULL",[item.id]))[0].q);
  const detail=(id:string)=>prod("GET",`/orders/${id}`);
  async function act(w:any,verb:string,reason="Explicit synthetic action",u=maker){return prod("POST",`/orders/${w.id}/${verb}`,{revision:w.revision,reason},200,u);}
  async function openOrder(quantity="10",extra={}){return prod("POST","/orders",{recipe_id:recipe.id,quantity,unit:"m",...extra},201);}
  async function running(quantity="2",extra={}){let w=await openOrder(quantity,extra);w=await act(w,"release","Approved",admin);w=await act(w,"reserve");return act(w,"start");}
  async function issue(w:any,q:string,scrap="0",unit="m",key=randomUUID()) {
    const d=await detail(w.id);return prod("POST",`/orders/${w.id}/issues`,{revision:w.revision,reservation_id:d.reservations[0].id,quantity:q,scrap_quantity:scrap,unit,location:"Shelf A",reason:"Actual input consumption"},201,maker,key);
  }
  async function output(w:any,q:string,code:string=randomUUID()){return prod("POST",`/orders/${w.id}/output`,{revision:w.revision,quantity:q,unit:"m",batch_code:code,location:"Shelf A",notes:"Synthetic batch"},201);}
  async function qc(w:any,b:any,q:string,decision="accept",key=randomUUID()){return prod("POST",`/orders/${w.id}/qc`,{revision:w.revision,batch_id:b.id,batch_revision:b.revision,quantity:q,decision,notes:"Synthetic inspection"},201,admin,key);}
  let recipe:any;let laser:any;let batch:any;
  it("migrates, rolls back empty schema and posts explicit verified openings",async()=>{
    for(const [item,q] of [[wire,"20"],[finished,"0"]] as const){let s=await create([target(item,["Shelf A"])]);s=await count(s,q,"Shelf A",item);s=await step(s,"review",{reason:"Complete count"});s=await step(s,"approve");await step(s,"post");}
    expect(await balance()).toBe(20);expect(await balance(finished)).toBe(0);
  });
  it("validates recipes and preserves approved versions and yield snapshots",async()=>{
    await prod("POST","/recipes",{name:"Invalid",definition:{...definition(),inputs:[null]}},400);
    await prod("POST","/recipes",{name:"Invalid",definition:{...definition(),inputs:[{item_id:wire.id,quantity:"2",unit:"invalid",scrap_percent:"0"}]}},400);
    await prod("POST","/recipes",{name:"Self",definition:{...definition(),inputs:[{item_id:finished.id,quantity:"1",unit:"m"}]}},400);
    recipe=await prod("POST","/recipes",{name:"Laser components",definition:definition()},201);
    recipe=await prod("PUT",`/recipes/${recipe.id}`,{revision:recipe.revision,name:"Laser components revised",definition:definition()});
    await prod("POST",`/recipes/${recipe.id}/approve`,{revision:recipe.revision},403);
    recipe=await prod("POST",`/recipes/${recipe.id}/approve`,{revision:recipe.revision},200,admin);
    await prod("PUT",`/recipes/${recipe.id}`,{revision:recipe.revision,name:"Forbidden",definition:definition()},409);
    const next=await prod("POST",`/recipes/${recipe.id}/version`,{revision:recipe.revision,name:"Next recipe",definition:definition()},201);expect(next.version).toBe(2);expect(next.status).toBe("draft");
    await expect(db.query("UPDATE production_recipes SET name='Altered' WHERE id=$1",[recipe.id])).rejects.toThrow();
  });
  it("protects authentication, current roles, ownership and unverified inputs",async()=>{
    await request("GET","/production-planning",undefined,undefined,401);
    await prod("POST","/orders",{recipe_id:recipe.id,quantity:"1",unit:"m"},403,viewer);
    await request("POST","/production-planning/orders",viewer,{recipe_id:recipe.id,quantity:"1",unit:"m"},403,{role:"admin"});
    await prod("POST","/orders",{recipe_id:recipe.id,quantity:"1",unit:"m"},404,other);
    let w=await prod("POST","/orders",{definition:{...definition(),inputs:[{item_id:unknown.id,quantity:"1",unit:"m"}]},quantity:"1",unit:"m"},201);
    await prod("POST",`/orders/${w.id}/release`,{revision:w.revision,reason:"Approve"},403,maker);
    w=await act(w,"release","Approve",admin);await prod("POST",`/orders/${w.id}/reserve`,{revision:w.revision},409);
    await prod("GET",`/orders/${w.id}`,undefined,404,other);await act(w,"cancel");
  });
  it("allocates yield and scrap without moving stock; serializes competing orders",async()=>{
    laser=await running("10");expect(laser.inputs[0].planned_quantity).toBe("11.0000");expect(await balance()).toBe(20);
    let a=await openOrder("8"),b=await openOrder("8");a=await act(a,"release","Approved",admin);b=await act(b,"release","Approved",admin);
    const responses=await Promise.all([a,b].map(w=>fetch(base+`/api/v1/production-planning/orders/${w.id}/reserve`,{method:"POST",headers:{Authorization:`Bearer ${token(maker)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({revision:w.revision})})));
    expect(responses.map(r=>r.status).sort()).toEqual([200,409]);for(const w of [a,b])await act((await detail(w.id)).order,"cancel");
    expect(await balance()).toBe(20);
  });
  it("consumes actual inputs exactly once with explicit conversion and scrap",async()=>{
    await db.getRepository(UomConversion).save({organization_id:maker.organization_id,from_uom:"cm",to_uom:"m",conversion_factor:0.01,is_active:true,item_id:wire.id});
    const d=await detail(laser.id),body={revision:laser.revision,reservation_id:d.reservations[0].id,quantity:"600",scrap_quantity:"100",unit:"cm",location:"Shelf A",reason:"Laser input and scrap"},key=randomUUID();
    const i=await prod("POST",`/orders/${laser.id}/issues`,body,201,maker,key);expect(await prod("POST",`/orders/${laser.id}/issues`,body,201,maker,key)).toEqual(i);
    expect(i.quantity).toBe("6.0000");expect(i.scrap_quantity).toBe("1.0000");expect(await balance()).toBe(14);
    laser=(await detail(laser.id)).order;await prod("POST",`/orders/${laser.id}/issues`,{...body,revision:laser.revision,unit:"kg"},400);
    expect((await db.query("SELECT count(*)::int n FROM stock_ledger WHERE production_issue_id=$1",[i.id]))[0].n).toBe(1);
  });
  it("records partial pending output without stock and rejects insufficient inputs",async()=>{
    await prod("POST",`/orders/${laser.id}/output`,{revision:laser.revision,quantity:"6",unit:"m",batch_code:"Too much",location:"Shelf A"},409);
    batch=await output(laser,"5","LASER-A");laser=(await detail(laser.id)).order;expect(await balance(finished)).toBe(0);
    await prod("POST",`/orders/${laser.id}/complete`,{revision:laser.revision,reason:"Premature"},409);
  });
  it("partially accepts exactly once, rejects remainder and releases unused allocation",async()=>{
    const body={revision:laser.revision,batch_id:batch.id,batch_revision:batch.revision,quantity:"3",decision:"accept",notes:"Passed"},key=randomUUID();
    const accepted=await prod("POST",`/orders/${laser.id}/qc`,body,201,admin,key);expect(await prod("POST",`/orders/${laser.id}/qc`,body,201,admin,key)).toEqual(accepted);
    let d=await detail(laser.id);laser=d.order;batch=d.batches[0];await qc(laser,batch,"2","reject");d=await detail(laser.id);laser=await act(d.order,"complete","Partial completion accepted");
    expect(await balance(finished)).toBe(3);expect(await balance()).toBe(14);expect((await detail(laser.id)).reservations[0].status).toBe("released");
    await prod("POST",`/orders/${laser.id}/complete`,{revision:laser.revision,reason:"Again"},409);
  });
  it("makes stock in multiple batches and tracks rework/resubmission",async()=>{
    let w=await running("2");await issue(w,"2");w=(await detail(w.id)).order;
    let b=await output(w,"1","STOCK-1");w=(await detail(w.id)).order;await qc(w,b,"1","rework");let d=await detail(w.id);w=d.order;b=d.batches[0];await qc(w,b,"1","resubmit");d=await detail(w.id);await qc(d.order,d.batches[0],"1");w=(await detail(w.id)).order;
    b=await output(w,"1","STOCK-2");w=(await detail(w.id)).order;await qc(w,b,"1");w=await act((await detail(w.id)).order,"complete");expect(w.project_id).toBeNull();expect(await balance(finished)).toBe(5);
  });
  it("serializes concurrent QC so accepted stock cannot double post",async()=>{
    let w=await running("1");await issue(w,"1");w=(await detail(w.id)).order;const b=await output(w,"1");w=(await detail(w.id)).order;
    const body={revision:w.revision,batch_id:b.id,batch_revision:b.revision,quantity:"1",decision:"accept",notes:"Concurrent inspection"};
    const responses=await Promise.all([1,2].map(()=>fetch(base+`/api/v1/production-planning/orders/${w.id}/qc`,{method:"POST",headers:{Authorization:`Bearer ${token(admin)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify(body)})));
    expect(responses.map(r=>r.status).sort()).toEqual([201,409]);await act((await detail(w.id)).order,"complete");expect(await balance(finished)).toBe(6);
  });
  it("links a multi-school requirement, respects project reservations and never dispatches",async()=>{
    const fixture=planningFixture(finished.id);const draft=await request("POST","/product-templates",maker,{name:"Production demand",subjects:fixture.subjects},201);const version=await request("POST",`/product-templates/${draft.template_id}/approve`,maker,{revision:1},201);for(const site of fixture.content.sites)site.selections[0].version_id=version.id;
    const project=await request("POST","/planning-projects",maker,fixture.content,201);projectId=project.id;const site=project.sites[0].id;
    let w=await running("1",{project_id:project.id,site_id:site,demand_revision:1});expect(w.site_id).toBe(site);expect(w.recipe_snapshot).toEqual(recipe.definition);
    await issue(w,"1");w=(await detail(w.id)).order;const b=await output(w,"1");await qc((await detail(w.id)).order,b,"1");await act((await detail(w.id)).order,"complete");
    const before=JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"));const preview=await request("POST",`/planning-projects/${project.id}/preview`,viewer,{revision:1});expect(preview.materials[0].verified_on_hand).toBe(7);await request("POST",`/planning-projects/${project.id}/preview`,viewer,{revision:1});expect(JSON.stringify(await db.query("SELECT * FROM stock_ledger ORDER BY id"))).toBe(before);
    expect(await db.query("SELECT * FROM project_stock_reservations WHERE project_id=$1",[project.id])).toEqual([]);
    const reserve=await fetch(base+"/api/v1/supply-planning/reservations",{method:"POST",headers:{Authorization:`Bearer ${token(maker)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify({project_id:project.id,site_id:site,item_id:finished.id,quantity:"2",unit:"m"})});expect(reserve.status,await reserve.text()).toBe(201);
    let blocked=await prod("POST","/orders",{definition:{output_item_id:wire.id,yield_quantity:"1",unit:"m",inputs:[{item_id:finished.id,quantity:"6",unit:"m"}]},quantity:"1",unit:"m"},201);blocked=await act(blocked,"release","Approve",admin);await prod("POST",`/orders/${blocked.id}/reserve`,{revision:blocked.revision},409);await act(blocked,"cancel");
  });
  it("reconciles physical ledger, preserves master and refuses populated rollback",async()=>{
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
    const rows=await db.query("SELECT item_id,qty_delta::text,running_balance::text,physical_sequence FROM stock_ledger WHERE verification_entry_id IS NOT NULL ORDER BY item_id,physical_sequence");const sums=new Map<string,number>();for(const row of rows){const sum=(sums.get(row.item_id)??0)+Number(row.qty_delta);expect(Number(row.running_balance)).toBeCloseTo(sum,4);sums.set(row.item_id,sum);}
    const d=await detail(laser.id);expect(d.history.at(-1).snapshot.status).toBe("draft");expect(d.history[0].snapshot.status).toBe("completed");expect(d.issues).toHaveLength(1);expect(d.qc).toHaveLength(2);
    const runner=db.createQueryRunner();await runner.connect();try{await expect(new AddProductionPlanning1791763200005().down(runner)).rejects.toThrow("refusing destructive rollback");}finally{await runner.release();}
  });
});
import { commitmentEntities } from "../../entity/CommitmentLedger";
