import { AddRequirementApproval1792368000013 } from "../../migration/1792368000013-AddRequirementApproval";
import { productionPlanningRouter } from "../v1/production-planning";
import { createHash } from "node:crypto";
import { canonicalRequirementJSON } from "../../services/RequirementApprovalService";
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
describe.skipIf(!url)("PostgreSQL authoritative requirement approval",()=>{
  let db:DataSource;let server:Server;let base:string;let maker:User;let admin:User;let viewer:User;let other:User;
  let wire:InventoryItem;let finished:InventoryItem;let unknown:InventoryItem;let session:Stocktake;let baseline:string;let projectId:string;
  const schema=`requirement_test_${randomUUID().replaceAll("-","")}`;
  const token=(u:User,claims={})=>jwt.sign({sub:u.id,orgId:u.organization_id,role:u.role,...claims},env.jwtSecret,{expiresIn:"10m"});
  async function request(method:string,path:string,u?:User,body?:unknown,expected=200,claims={}) {
    const r=await fetch(base+"/api/v1"+path,{method,headers:{"Content-Type":"application/json",...(u?{Authorization:`Bearer ${token(u,claims)}`}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
    const text=await r.text();expect(r.status,text).toBe(expected);return text?JSON.parse(text):null;
  }
  async function start(){const app=express();app.use(express.json());app.use("/api/v1/production-planning",productionPlanningRouter(db));app.use("/api/v1/attachments",attachmentRouter(db));app.use("/api/v1/packing-label-layouts",labelLayoutRouter(db));app.use("/api/v1/packing",packingRouter(db));app.use("/api/v1/delivery",deliveryRouter(db));app.use("/api/v1/supply-planning",supplyPlanningRouter(db));app.use("/api/v1/stocktakes",stocktakeRouter(db));app.use("/api/v1/product-templates",productTemplateRouter(db));app.use("/api/v1/planning-projects",planningProjectRouter(db));server=await new Promise<Server>(resolve=>{const s=app.listen(0,"127.0.0.1",()=>resolve(s));});const a=server.address();if(!a||typeof a==="string")throw new Error("Missing port");base=`http://127.0.0.1:${a.port}`;}
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

  let project:any, content:any, historical:any, approval:any, reservation:any; let approvalKey = randomUUID();
  const approvals=(id=project.id)=>`/planning-projects/${id}/requirement-approvals`;
  async function newProject(creator=maker) {
    const f=planningFixture(wire.id);
    const d=await request("POST","/product-templates",maker,{name:"Approval demand",subjects:f.subjects},201);
    const v=await request("POST",`/product-templates/${d.template_id}/approve`,maker,{revision:1},201);
    for(const site of f.content.sites)site.selections[0].version_id=v.id;
    return {content:f.content,project:await request("POST","/planning-projects",creator,f.content,201)};
  }
  async function fingerprint(){
    const result:Record<string,unknown>={};
    for(const table of ["inventory_items","stock_ledger","physical_stocktakes","physical_stock_scopes","physical_stocktake_events","project_stock_reservations","purchase_requests","purchase_orders","purchase_goods_receipts","supply_events","production_work_orders","production_input_reservations","production_input_issues","production_batches","production_qc_decisions","packing_orders","packing_picks","delivery_orders","delivery_package_claims","package_custody_events","site_installations","project_completions"])
      result[table]=await db.query(`SELECT count(*)::int count,md5(COALESCE(string_agg(row_to_json(t)::text,'|' ORDER BY row_to_json(t)::text),'')) hash FROM ${table} t`);
    return result;
  }
  it("round-trips migration without rewriting historical execution or physical truth",async()=>{
    let s=await create([target(wire,["Shelf A"])]);s=await count(s,"20");s=await step(s,"review",{reason:"Complete count"});s=await step(s,"approve");await step(s,"post");
    ({project,content}=await newProject());
    historical=await prod("POST","/orders",{batch_code:"HISTORICAL",project_id:project.id,site_id:project.sites[0].id,demand_revision:1},201);
    const before=await fingerprint();
    const runner=db.createQueryRunner();await runner.connect();await runner.startTransaction();
    try{const migration=new AddRequirementApproval1792368000013();await migration.up(runner);await migration.down(runner);await migration.up(runner);await runner.commitTransaction();}catch(e){await runner.rollbackTransaction();throw e;}finally{await runner.release();}
    const after=await fingerprint();expect(after).toEqual(before);
    console.info("13M-A migration fingerprint",JSON.stringify({schema,before,after}));
    expect(await db.query("SELECT * FROM requirement_execution_bindings")).toHaveLength(0);
    await prod("POST",`/orders/${historical.id}/release`,{revision:historical.revision},409,admin);
    expect((await prod("GET",`/orders/${historical.id}`)).order.id).toBe(historical.id);
  });
  it("denies direct API execution without approval and current tenant authority",async()=>{
    const b={project_id:project.id,site_id:project.sites[0].id,item_id:wire.id,quantity:"1",unit:"m"};
    await supply("/reservations",b,409);
    await supply("/requests",{lines:[{...b,qc_required:true,notes:""}],notes:""},409);
    await request("POST",approvals(),maker,{revision:1,key:randomUUID()},403);
    await request("POST",approvals(),viewer,{revision:1,key:randomUUID()},403);
    await request("POST",approvals(),other,{revision:1,key:randomUUID()},404);
    await request("POST",approvals(),undefined,{revision:1,key:randomUUID()},401);
    await request("POST",approvals(),admin,{revision:2,key:randomUUID()},409);
    await request("POST",approvals(),admin,{revision:1,key:" "},400);
    await request("POST",approvals(),admin,{revision:1,key:randomUUID(),approved_by:maker.id},400);
  });
  it("rejects empty schools and zero demand without creating evidence",async()=>{
    const empty=await request("POST","/planning-projects",maker,{...content,sites:[]},201);
    await request("POST",approvals(empty.id),admin,{revision:1,key:randomUUID()},400);
    const f=await newProject();for(const school of f.content.sites){school.selections[0].context.grade_quantities={};school.selections[0].context.complete_sets=Object.fromEntries(Object.keys(school.selections[0].context.complete_sets).map(k=>[k,0]));}
    const zero=await request("PUT",`/planning-projects/${f.project.id}`,maker,{...f.content,revision:1});
    await request("POST",approvals(zero.id),admin,{revision:2,key:randomUUID()},400);
  });
  it("converges concurrent approvals and durable retries without operational mutations",async()=>{
    const before=await fingerprint(),key=approvalKey;
    const results=await Promise.all([key,key,randomUUID()].map(k=>request("POST",approvals(),admin,{revision:1,key:k},201)));
    expect(new Set(results.map(a=>a.id)).size).toBe(1);approval=results[0];
    expect(approval.approved_by).toBe(admin.id);expect(Date.parse(approval.approved_at)).toBeGreaterThan(0);
    expect(approval.snapshot.content.sites).toHaveLength(2);expect(approval.snapshot.lines.length).toBeGreaterThan(0);
    expect(approval.snapshot_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(approval.snapshot_hash).toBe(createHash("sha256").update(canonicalRequirementJSON(approval.snapshot)).digest("hex"));
    expect(approval.snapshot.lines.filter((l:any)=>l.inventory_item_id===wire.id).reduce((n:number,l:any)=>n+l.quantity,0)).toBeCloseTo(3.3);
    const after=await fingerprint();expect(after).toEqual(before);
    console.info("13M-A approval fingerprint",JSON.stringify({schema,before,after,approval_rows:(await db.query("SELECT count(*)::int n FROM requirement_approvals"))[0].n,retry_rows:(await db.query("SELECT count(*)::int n FROM requirement_approval_retries"))[0].n}));
    expect(await request("GET",approvals(),viewer)).toEqual([approval]);
    await request("GET",approvals(),other,undefined,404);
    expect(await request("POST",approvals(),admin,{revision:1,key},201)).toEqual(approval);
    await request("POST",approvals(),admin,{revision:2,key},409);
    await expect(db.query("UPDATE requirement_approvals SET snapshot='{}' WHERE id=$1",[approval.id])).rejects.toThrow();
    await expect(db.query("DELETE FROM requirement_approvals WHERE id=$1",[approval.id])).rejects.toThrow();
    const runner=db.createQueryRunner();await runner.connect();try{await expect(new AddRequirementApproval1792368000013().down(runner)).rejects.toThrow("forward recovery");}finally{await runner.release();}
  });
  it("binds correct execution and stamps procurement evidence in response and audit",async()=>{
    reservation=await supply("/reservations",{project_id:project.id,site_id:project.sites[0].id,item_id:wire.id,quantity:"1",unit:"m"});
    const pr=await supply("/requests",{lines:[{project_id:project.id,site_id:project.sites[0].id,item_id:wire.id,quantity:"1",unit:"m",qc_required:true,notes:""}],notes:""});
    expect(pr.lines[0].requirement_approval_id).toBe(approval.id);
    expect(pr.lines[0].demand_revision).toBe(1);
    await supply(`/requests/${pr.id}/review`,{revision:pr.revision},200,admin);
    const pack=await prod("POST","/orders",{batch_code:"APPROVED",project_id:project.id,site_id:project.sites[1].id,demand_revision:1},201);
    const rows=await db.query("SELECT * FROM requirement_execution_bindings WHERE record_id=ANY($1::uuid[])",[[reservation.id,pr.lines[0].id,pack.id]]);
    expect(rows).toHaveLength(3);expect(rows.every((r:any)=>r.approval_id===approval.id&&r.revision===1)).toBe(true);
    await prod("POST","/orders",{batch_code:"STALE",project_id:project.id,site_id:project.sites[1].id,demand_revision:2},409);
    await expect(db.query("UPDATE requirement_execution_bindings SET revision=2 WHERE record_id=$1",[reservation.id])).rejects.toThrow();
  });
  async function operation(area:string,path:string,body:unknown,status=200,u=admin){
    const r=await fetch(`${base}/api/v1/${area}${path}`,{method:"POST",headers:{Authorization:`Bearer ${token(u)}`,"Content-Type":"application/json","Idempotency-Key":randomUUID()},body:JSON.stringify(body)});
    const text=await r.text();expect(r.status,text).toBe(status);return JSON.parse(text);
  }
  it("rejects historical completion even with an explicit exception",async()=>{
    await operation("delivery",`/projects/${project.id}/completion`,{revision:0,project_revision:1,action:"close",recipient:"Synthetic",notes:"Attempted historical exception",exception_reason:"Historical packing exists"},409);
  });
  it("serializes a concurrent save and approval without approving unsaved content",async()=>{
    const f=await newProject();
    const results=await Promise.all([
      fetch(`${base}/api/v1${approvals(f.project.id)}`,{method:"POST",headers:{Authorization:`Bearer ${token(admin)}`,"Content-Type":"application/json"},body:JSON.stringify({revision:1,key:randomUUID()})}),
      request("PUT",`/planning-projects/${f.project.id}`,maker,{...f.content,name:"Concurrent saved revision",revision:1})
    ]);
    const response=results[0] as Response;expect([201,409]).toContain(response.status);
    const rows=await request("GET",approvals(f.project.id),viewer);
    expect(rows).toHaveLength(response.status===201?1:0);
    if(rows.length){expect(rows[0].revision).toBe(1);expect(rows[0].snapshot.content.name).toBe(f.content.name);}
    await prod("POST","/orders",{batch_code:"RACE-STALE",project_id:f.project.id,site_id:f.project.sites[0].id,demand_revision:1},409);
  });
  it("allows admin self-approval and rechecks disabled or demoted retry actors",async()=>{
    const {project:own}=await newProject(admin); const key=randomUUID();
    const a=await request("POST",approvals(own.id),admin,{revision:1,key},201);expect(a.approved_by).toBe(admin.id);
    await db.query("UPDATE users SET role='staff' WHERE id=$1",[admin.id]);
    await request("POST",approvals(own.id),admin,{revision:1,key},403);
    await db.query("UPDATE users SET role='admin',is_active=false WHERE id=$1",[admin.id]);
    await request("POST",approvals(own.id),admin,{revision:1,key},403);
    await db.query("UPDATE users SET is_active=true WHERE id=$1",[admin.id]);
    expect(await request("POST",approvals(own.id),admin,{revision:1,key},201)).toEqual(a);
  });
  it("guards production creation and child allocation under the exact approval",async()=>{
    let s=await create([target(finished,["Shelf A"])]);s=await count(s,"5","Shelf A",finished);s=await step(s,"review",{reason:"Synthetic inputs"});s=await step(s,"approve");await step(s,"post");
    const body={project_id:project.id,site_id:project.sites[0].id,demand_revision:1,quantity:"0.1",unit:"m",definition:{output_item_id:wire.id,yield_quantity:"1",unit:"m",inputs:[{item_id:finished.id,quantity:"1",unit:"m",scrap_percent:"0"}]}};
    await operation("production-planning","/orders",{...body,quantity:"999"},400,maker);
    let w=await operation("production-planning","/orders",body,201,maker);
    w=await operation("production-planning",`/orders/${w.id}/release`,{revision:w.revision,reason:"Approved manufacturing"});
    w=await operation("production-planning",`/orders/${w.id}/reserve`,{revision:w.revision},200,maker);
    expect((await db.query("SELECT approval_id FROM requirement_execution_bindings WHERE record_id=$1",[w.id]))[0].approval_id).toBe(approval.id);
  });
  it("permits approved packing, custody and lifecycle while blocking exception bypass",async()=>{
    const f=await newProject(),id=f.project.id;
    const complete=(revision:number,action:string)=>({revision,project_revision:1,action,recipient:"Synthetic recipient",notes:"Synthetic review",exception_reason:"Synthetic outstanding school reconciliation"});
    await operation("delivery",`/projects/${id}/completion`,complete(0,"close"),409);
    const a=await request("POST",approvals(id),admin,{revision:1,key:randomUUID()},201);
    let p=await prod("POST","/orders",{batch_code:"LIFECYCLE",project_id:id,site_id:f.project.sites[1].id,demand_revision:1},201);
    p=await prod("POST",`/orders/${p.id}/release`,{revision:p.revision},200,admin);
    p=await prod("POST",`/orders/${p.id}/picks`,{revision:p.revision,item_id:wire.id,quantity:"0.9",unit:"m",location:"Shelf A"},201);
    const ids=p.snapshot.packages.map((v:any)=>v.id);
    p=await prod("POST",`/orders/${p.id}/checklist`,{revision:p.revision,package_ids:ids,assembled:true});
    p=await prod("POST",`/orders/${p.id}/qc`,{revision:p.revision,package_ids:ids,decision:"accept",checks:{material:true,quantity:true,placement:true,packaging:true,stickers:true,instructions:true}},200,admin);
    let d=await operation("delivery","/orders",{packing_order_id:p.id,package_ids:p.snapshot.packages.filter((v:any)=>v.kind==="kit").map((v:any)=>v.id),transport:{carrier:"Synthetic",planned_date:new Date().toISOString()}},201);
    d=await operation("delivery",`/orders/${d.id}/dispatch`,{revision:d.revision});
    d=await operation("delivery",`/orders/${d.id}/receive`,{revision:d.revision,package_ids:d.manifest.map((v:any)=>v.id),recipient:"Synthetic school",acknowledged_at:new Date().toISOString(),acknowledgement:"Physically received"},200,maker);
    const job=await operation("delivery","/installations",{project_id:id,site_id:f.project.sites[1].id,required:false,checklist:[{id:randomUUID(),label:"Confirm no setup",required:false}],survey:"No installation required"},201);
    const before=await balance();let c=await operation("delivery",`/projects/${id}/completion`,complete(0,"close"));
    c=await operation("delivery",`/projects/${id}/completion`,complete(c.revision,"reopen"));expect(c.status).toBe("active");
    const bound=await db.query("SELECT approval_id FROM requirement_execution_bindings WHERE record_id=ANY($1::uuid[])",[[p.id,d.id,job.id,c.id]]);
    expect(bound).toHaveLength(4);expect(bound.every((v:any)=>v.approval_id===a.id)).toBe(true);expect(await balance()).toBe(before);
    await request("PUT",`/planning-projects/${id}`,maker,{...f.content,revision:1});
    await operation("delivery",`/installations/${job.id}`,{revision:job.revision,action:"note",notes:"Superseded"},409);
    await operation("delivery",`/projects/${id}/completion`,{...complete(c.revision,"close"),project_revision:2},409);
  });
  it("supersedes execution on save while retaining retry and historical approval",async()=>{
    project=await request("PUT",`/planning-projects/${project.id}`,maker,{...content,name:"New requirement draft",revision:1});
    await supply(`/reservations/${reservation.id}/release`,{revision:reservation.revision,reason:"New draft blocks execution"},409);
    await prod("POST","/orders",{batch_code:"UNAPPROVED-NEW",project_id:project.id,site_id:project.sites[0].id,demand_revision:2},409);
    await request("POST",approvals(),admin,{revision:1,key:randomUUID()},409);
    const next=await request("POST",approvals(),admin,{revision:2,key:randomUUID()},201);
    expect(next.id).not.toBe(approval.id);
    expect(await request("POST",approvals(),admin,{revision:1,key:approvalKey},201)).toEqual(approval);
    expect((await request("GET",approvals(),viewer)).map((a:any)=>a.revision)).toEqual([2,1]);
    await supply(`/reservations/${reservation.id}/release`,{revision:reservation.revision,reason:"Old approval remains stale"},409);
    expect(JSON.stringify(await db.query("SELECT * FROM inventory_items ORDER BY id"))).toBe(baseline);
    expect(await balance()).toBeCloseTo(19.1);
  });
});
