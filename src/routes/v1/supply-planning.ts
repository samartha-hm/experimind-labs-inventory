import { Router,type RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsString,MinLength,MaxLength,IsInt,Min,IsUUID,IsBoolean,IsOptional,IsArray } from "class-validator";
import { authenticateJwt } from "../../middleware/auth";
import { User } from "../../entity/User";
import { dto } from "./product-templates";
import { SupplyPlanningService,type LineInput } from "../../services/SupplyPlanningService";
import { DraftKitError } from "../../services/ProductTemplateService";
class RevisionDto { @IsInt() @Min(1) revision!:number; }
class ReservationDto {
  @IsUUID() project_id!:string;
  @IsUUID() site_id!:string;
  @IsUUID() item_id!:string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsString() @MinLength(1) @MaxLength(30) unit!:string;
  @IsString() @MaxLength(2000) notes:string="";
}
class ReservationActionDto extends RevisionDto {
  @IsString() @MinLength(1) @MaxLength(2000) reason!:string;
  @IsOptional() @IsString() @MaxLength(20) quantity?:string;
  @IsOptional() @IsString() @MaxLength(100) location?:string;
}
class RequestDto {
  @IsArray() lines!:LineInput[];
  @IsString() @MaxLength(5000) notes:string="";
}
class RequestEditDto extends RequestDto { @IsInt() @Min(1) revision!:number; }
class ShortageDto extends RevisionDto {
  @IsUUID() project_id!:string;
  @IsUUID() site_id!:string;
  @IsBoolean() qc_required:boolean=true;
}
class OrderDto extends RevisionDto { @IsUUID() request_id!:string; @IsUUID() supplier_id!:string; }
class ReceiptDto extends RevisionDto {
  @IsUUID() line_id!:string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!:string;
  @IsString() @MinLength(1) @MaxLength(30) unit!:string;
  @IsString() @MinLength(1) @MaxLength(100) location!:string;
}
class InspectionDto extends RevisionDto { @IsString() @MinLength(1) @MaxLength(2000) reason!:string; }
class SupplierDto { @IsString() @MinLength(1) @MaxLength(200) name!:string; }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const writers=new Set(["admin","super_admin","manager","staff","inventory_staff","project_staff","editor"]);
const reviewers=new Set(["admin","super_admin","manager","inventory_staff"]);
const approvers=new Set(["admin","super_admin","manager"]);
export function supplyPlanningRouter(db:DataSource) {
  const router=Router(),s=new SupplyPlanningService(db);
  const action=(run:RequestHandler):RequestHandler=>(req,res,next)=>{Promise.resolve(run(req,res,next)).catch((e:unknown)=>{
    if(e instanceof DraftKitError)res.status(e.status).json({error:e.message});
    else if(e&&typeof e==="object"&&"code" in e&&["23505","23503","23514","P0001","40001","40P01"].includes(String(e.code)))res.status(409).json({error:"Supply conflict; refresh quantities and revision before retrying"});
    else {console.error("Supply operation failed",e instanceof Error?e.name:"Error");res.status(500).json({error:"Unable to process supply operation"});}
  });};
  router.use((req,res,next)=>{if(!req.headers.authorization?.startsWith("Bearer ")){res.status(401).json({error:"Sign in required"});return;}next();},authenticateJwt);
  router.use(action(async(req,res,next)=>{
    const u=req.user;if(!u?.orgId||!uuid.test(u.orgId)||!uuid.test(u.id)||u.orgId==="00000000-0000-0000-0000-000000000000")throw new DraftKitError(403,"Explicit organization required");
    const current=await db.getRepository(User).findOneBy({id:u.id,organization_id:u.orgId,is_active:true});if(!current)throw new DraftKitError(403,"Organization access denied");u.role=current.role;
    const read=["GET","HEAD","OPTIONS"].includes(req.method);
    const required=/\/approve\/?$/.test(req.path)?approvers:/\/(review|accept|reject|quarantine|fulfill)\/?$/.test(req.path)?reviewers:writers;
    if(read?!writers.has(current.role)&&current.role!=="viewer":!required.has(current.role))throw new DraftKitError(403,"Supply planning permission denied");
    if(!read){const key=req.header("Idempotency-Key");if(!key||key.length>100)throw new DraftKitError(400,"Idempotency-Key header required");}next();
  }));
  router.param("id",(_req,_res,next,id:string)=>{next(uuid.test(id)?undefined:new DraftKitError(400,"Invalid identity"));});
  const key=(req:Parameters<RequestHandler>[0])=>req.header("Idempotency-Key")!;
  router.get("/",action(async(req,res)=>{const project=req.query.project;if(project!==undefined&&(typeof project!=="string"||!uuid.test(project)))throw new DraftKitError(400,"Invalid project identity");res.json(await s.list(req.user!.orgId!,project as string|undefined));}));
  router.get("/:kind/:id/history",action(async(req,res)=>{if(!["reservation","request","order","receipt","supplier"].includes(req.params.kind))throw new DraftKitError(400,"Invalid history kind");res.json(await s.history(req.user!.orgId!,req.params.kind,req.params.id));}));
  router.post("/suppliers",action(async(req,res)=>{const d=await dto(req.body,SupplierDto);res.status(201).json(await s.supplier(req.user!.orgId!,req.user!.id,key(req),d.name.trim()));}));
  router.post("/reservations",action(async(req,res)=>{const d=await dto(req.body,ReservationDto);res.status(201).json(await s.reserve(req.user!.orgId!,req.user!.id,key(req),d));}));
  for(const verb of ["adjust","release","cancel","fulfill"] as const)router.post(`/reservations/:id/${verb}`,action(async(req,res)=>{const d=await dto(req.body,ReservationActionDto);res.json(await s.reservation(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,verb,d.reason,d.quantity,d.location));}));
  router.post("/requests",action(async(req,res)=>{const d=await dto(req.body,RequestDto);res.status(201).json(await s.request(req.user!.orgId!,req.user!.id,key(req),d.lines,d.notes));}));
  router.put("/requests/:id",action(async(req,res)=>{const d=await dto(req.body,RequestEditDto);res.json(await s.request(req.user!.orgId!,req.user!.id,key(req),d.lines,d.notes,req.params.id,d.revision));}));
  router.post("/requests/from-shortage",action(async(req,res)=>{const d=await dto(req.body,ShortageDto);res.status(201).json(await s.shortageRequest(req.user!.orgId!,req.user!.id,key(req),d.project_id,d.site_id,d.revision,d.qc_required));}));
  for(const verb of ["review","approve","cancel"] as const){
    router.post(`/requests/:id/${verb}`,action(async(req,res)=>{const d=await dto(req.body,RevisionDto);res.json(await s.requestTransition(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,verb));}));
    router.post(`/orders/:id/${verb}`,action(async(req,res)=>{const d=await dto(req.body,RevisionDto);res.json(await s.orderTransition(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,verb));}));
  }
  router.post("/orders",action(async(req,res)=>{const d=await dto(req.body,OrderDto);res.status(201).json(await s.order(req.user!.orgId!,req.user!.id,key(req),d.request_id,d.revision,d.supplier_id));}));
  router.post("/orders/:id/receipts",action(async(req,res)=>{const d=await dto(req.body,ReceiptDto);res.status(201).json(await s.receive(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,d.line_id,d.quantity,d.unit,d.location));}));
  for(const verb of ["accept","reject","quarantine"] as const)router.post(`/receipts/:id/${verb}`,action(async(req,res)=>{const d=await dto(req.body,InspectionDto);res.json(await s.inspect(req.user!.orgId!,req.user!.id,key(req),req.params.id,d.revision,verb,d.reason));}));
  router.use(((e:unknown,_req,res,next)=>{if(e instanceof DraftKitError)res.status(e.status).json({error:e.message});else next(e);}) as import("express").ErrorRequestHandler);
  return router;
}
