import { trustedPackingRoutes } from "./trusted-packing";
import {Router,type RequestHandler} from "express";
import {DataSource} from "typeorm";
import {IsString,IsUUID,IsInt,Min,MinLength,MaxLength,IsOptional,IsIn,IsObject,Matches} from "class-validator";
import {authenticateJwt} from "../../middleware/auth";
import {User} from "../../entity/User";
import {dto} from "./product-templates";
import {DraftKitError} from "../../services/ProductTemplateService";
import {ProductionPlanningService} from "../../services/ProductionPlanningService";
import type {RecipeDefinition,ProductionWorkOrder,ProductionQcDecision} from "../../entity/ProductionPlanning";
import type {TrustedLedgerAuthority} from "../../security/TrustedLedgerAuthority";
import type {RecipePublication} from "../../services/RecipePublicationService";
class Revision { @IsInt() @Min(1) revision!:number; }
class RecipeDto {
  @IsString() @MinLength(1) @MaxLength(200) name!:string;
  @IsObject() definition!:RecipeDefinition;
  @IsOptional() @IsInt() @Min(1) revision?:number;
}
class CreateDto {
  @IsOptional() @IsUUID() recipe_id?:string;
  @IsOptional() @IsObject() definition?:RecipeDefinition;
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsString() @MinLength(1) @MaxLength(30) unit!:string;
  @IsOptional() @IsUUID() project_id?:string;
  @IsOptional() @IsUUID() site_id?:string;
  @IsOptional() @IsInt() @Min(1) demand_revision?:number;
  @IsOptional() @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) due_date?:string;
  @IsOptional() @IsIn(["low","normal","high","urgent"]) priority?:ProductionWorkOrder["priority"];
  @IsOptional() @IsUUID() assigned_employee_id?:string;
  @IsOptional() @IsString() @MaxLength(200) assigned_team?:string;
  @IsOptional() @IsString() @MaxLength(5000) instructions?:string;
}
class ActionDto extends Revision { @IsString() @MaxLength(2000) reason:string=""; }
class AssignDto extends Revision { @IsString() @MaxLength(200) assigned_team!:string; @IsOptional() @IsUUID() assigned_employee_id?:string; }
class IssueDto extends ActionDto {
  @IsUUID() reservation_id!:string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsString() @MinLength(1) @MaxLength(30) unit!:string;
  @IsString() @MaxLength(20) scrap_quantity:string="0";
  @IsString() @MinLength(1) @MaxLength(100) location!:string;
}
class OutputDto extends Revision {
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsString() @MinLength(1) @MaxLength(30) unit!:string;
  @IsString() @MinLength(1) @MaxLength(100) batch_code!:string;
  @IsString() @MinLength(1) @MaxLength(100) location!:string;
  @IsString() @MaxLength(2000) notes:string="";
}
class QcDto extends Revision {
  @IsUUID() batch_id!:string;
  @IsInt() @Min(1) batch_revision!:number;
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsIn(["accept","reject","rework","resubmit"]) decision!:ProductionQcDecision["decision"];
  @IsString() @MinLength(1) @MaxLength(2000) notes!:string;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writers=new Set(["admin","super_admin","manager","staff","inventory_staff","production_staff","project_staff","editor"]),approvers=new Set(["admin","super_admin","manager"]),inspectors=new Set(["admin","super_admin","manager","inventory_staff"]);
export function productionPlanningRouter(db:DataSource,authority?:TrustedLedgerAuthority){
  const r=Router(),s=new ProductionPlanningService(db);
  const action=(run:RequestHandler):RequestHandler=>(req,res,next)=>{Promise.resolve(run(req,res,next)).catch((e:unknown)=>{if(e instanceof DraftKitError)res.status(e.status).json({error:e.message});else if(e&&typeof e==="object"&&"code" in e&&["23505","23503","23514","P0001","40001","40P01","22007"].includes(String(e.code)))res.status(409).json({error:"Production conflict; refresh before retrying"});else{console.error("Production operation failed",e instanceof Error?e.name:"Error");res.status(500).json({error:"Unable to process production operation"});}});};
  r.use((req,res,next)=>{if(!req.headers.authorization?.startsWith("Bearer ")){res.status(401).json({error:"Sign in required"});return;}next();},authenticateJwt);
  r.use(action(async(req,res,next)=>{const u=req.user;if(!u?.orgId||!uuid.test(u.orgId)||!uuid.test(u.id)||u.orgId==="00000000-0000-0000-0000-000000000000")throw new DraftKitError(403,"Explicit organization required");const current=await db.getRepository(User).findOneBy({id:u.id,organization_id:u.orgId,is_active:true});if(!current)throw new DraftKitError(403,"Organization access denied");u.role=current.role;
    const read=["GET","HEAD","OPTIONS"].includes(req.method),roles=/\/(approve|release)\/?$/.test(req.path)?approvers:/\/qc\/?$/.test(req.path)?inspectors:writers;
    if(read?!writers.has(current.role)&&current.role!=="viewer":!roles.has(current.role))throw new DraftKitError(403,"Production permission denied");if(!read&&!req.header("Idempotency-Key"))throw new DraftKitError(400,"Idempotency-Key required");next();}));
  r.param("id",(_req,_res,next,id:string)=>next(uuid.test(id)?undefined:new DraftKitError(400,"Invalid identity")));
  const key=(req:Parameters<RequestHandler>[0])=>req.header("Idempotency-Key")!;
  trustedPackingRoutes(r,db,authority,action);
  r.get("/trusted-work-queue",action(async(req,res)=>{
    res.setHeader("Cache-Control","no-store");
    const [{installed}]=await db.query("SELECT to_regclass('production_output_custody') IS NOT NULL installed");
    if(!authority||!installed){res.json({enabled:false,orders:[]});return;}
    const orders=await db.query(`SELECT w.id,w.number,w.project_id,w.site_id,w.planned_quantity,w.unit,w.recipe_id,
      w.recipe_snapshot,w.demand_revision,c.approval_id,c.demand_line,
      (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'item',m.item_id,'name',i.name,
        'unit',a.unit,'held',cl.held::text,'fulfilled',cl.fulfilled::text) ORDER BY m.id),'[]')
       FROM commitment_work_order_materials m JOIN commitment_accounts a ON a.id=m.account_id
       JOIN commitment_claims cl ON cl.id=m.claim_id JOIN inventory_items i ON i.id=m.item_id WHERE m.order_id=w.id) materials,
      (SELECT coalesce(jsonb_agg(to_jsonb(o) ORDER BY o.created_at),'[]') FROM production_output_custody o WHERE o.order_id=w.id) outputs
      FROM production_work_orders w JOIN commitment_work_orders c ON c.order_id=w.id
      WHERE w.organization_id=$1 ORDER BY w.created_at DESC LIMIT 100`,[req.user!.orgId]);
    res.json({enabled:true,orders});
  }));
  for(const [path,actionName] of [["material-issues","issueWorkOrder"],["finished-outputs","recordFinishedOutput"]] as const)
    r.post(`/operator/orders/:id/${path}`,action(async(req,res)=>{
      if(!["admin","super_admin"].includes(req.user!.role))throw new DraftKitError(403,"Production administrator required");
      if(!authority)throw new DraftKitError(503,"Trusted production unavailable");
      if(req.body?.order!==req.params.id)throw new DraftKitError(409,"Work-order identity mismatch");
      try {res.status(201).json(await authority.performProductionForSession(req.headers.authorization!.slice(7),
        {action:actionName,key:key(req),input:req.body}));}
      catch {throw new DraftKitError(409,"Production authorization or state conflict; refresh and reconcile before changing the request");}
    }));
  r.post("/recipe-versions",action(async(req,res)=>{
    if(!["admin","super_admin"].includes(req.user!.role))throw new DraftKitError(403,"Recipe administrator required");
    if(!authority)throw new DraftKitError(503,"Trusted recipe publication unavailable");
    const capability=req.header("X-Ledger-Capability");
    if(!capability)throw new DraftKitError(403,"Recipe publication capability required");
    try {res.status(201).json(await authority.performForSession(req.headers.authorization!.slice(7),capability,
      {action:"publishRecipe",key:key(req),input:req.body as RecipePublication}));}
    catch {throw new DraftKitError(409,"Recipe publication authorization or state conflict");}
  }));
  for (const [path, actionName] of [["/work-order-claims","claimWorkOrder"],["/orders/:id/material-issues","issueWorkOrder"],["/orders/:id/finished-outputs","recordFinishedOutput"]] as const)
    r.post(path,action(async(req,res)=>{
      if(!["admin","super_admin"].includes(req.user!.role))throw new DraftKitError(403,"Production administrator required");
      if(!authority)throw new DraftKitError(503,"Trusted production unavailable");
      const capability=req.header("X-Ledger-Capability");
      if(!capability)throw new DraftKitError(403,"Production capability required");
      if(actionName!=="claimWorkOrder" && req.body?.order!==req.params.id)throw new DraftKitError(409,"Work-order identity mismatch");
      try {res.status(201).json(await authority.performForSession(req.headers.authorization!.slice(7),capability,
        {action:actionName,key:key(req),input:req.body}));}
        catch {throw new DraftKitError(409,"Production authorization or state conflict");}
    }));
  r.get("/execution-readiness",action(async(_req,res)=>{res.setHeader("Cache-Control","no-store");res.json(await executionReadiness(db));}));
  r.get("/",action(async(req,res)=>{res.json(await s.list(req.user!.orgId!));}));
  r.get("/orders/:id",action(async(req,res)=>{res.json(await s.detail(req.user!.orgId!,req.params.id));}));
  r.post("/recipes",action(async(req,res)=>{const d=await dto(req.body,RecipeDto);res.status(201).json(await s.recipe(req.user!.orgId!,req.user!.id,key(req),d.name,d.definition));}));
  r.put("/recipes/:id",action(async(req,res)=>{const d=await dto(req.body,RecipeDto);if(!d.revision)throw new DraftKitError(400,"Revision required");res.json(await s.recipe(req.user!.orgId!,req.user!.id,key(req),d.name,d.definition,req.params.id,d.revision));}));
  r.post("/recipes/:id/version",action(async(req,res)=>{const d=await dto(req.body,RecipeDto);if(!d.revision)throw new DraftKitError(400,"Revision required");res.status(201).json(await s.recipe(req.user!.orgId!,req.user!.id,key(req),d.name,d.definition,req.params.id,d.revision,true));}));
  r.post("/recipes/:id/approve",action(async(req,res)=>{const d=await dto(req.body,Revision);res.json(await s.approveRecipe(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision));}));
  r.post("/orders",action(async(req,res)=>{const d=await dto(req.body,CreateDto);res.status(201).json(await s.create(req.user!.orgId!,req.user!.id,key(req),d));}));
  r.post("/orders/:id/assign",action(async(req,res)=>{const d=await dto(req.body,AssignDto);res.json(await s.assign(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,d.assigned_team,d.assigned_employee_id));}));
  for(const verb of ["release","reserve","start","complete","cancel"] as const)r.post(`/orders/:id/${verb}`,action(async(req,res)=>{const d=await dto(req.body,ActionDto);res.json(await s.transition(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,verb,d.reason));}));
  r.post("/orders/:id/issues",action(async(req,res)=>{const d=await dto(req.body,IssueDto);res.status(201).json(await s.issue(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,d.reservation_id,d.quantity,d.unit,d.scrap_quantity,d.location,d.reason));}));
  r.post("/orders/:id/output",action(async(req,res)=>{const d=await dto(req.body,OutputDto);res.status(201).json(await s.output(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,d.quantity,d.unit,d.batch_code,d.location,d.notes));}));
  r.post("/orders/:id/qc",action(async(req,res)=>{const d=await dto(req.body,QcDto);res.status(201).json(await s.qc(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,d.batch_id,d.batch_revision,d.quantity,d.decision,d.notes));}));
  r.use(((e:unknown,_req,res,next)=>{if(e instanceof DraftKitError)res.status(e.status).json({error:e.message});else next(e);}) as import("express").ErrorRequestHandler);return r;
}
import { executionReadiness } from "../../services/ExecutionReadinessService";
