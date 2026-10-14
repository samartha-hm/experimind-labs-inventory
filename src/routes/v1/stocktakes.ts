import { Router, type RequestHandler } from "express";
import { DataSource } from "typeorm";
import { IsString, MinLength, MaxLength, IsArray, IsInt, Min, IsUUID, IsBoolean } from "class-validator";
import { User } from "../../entity/User";
import { authenticateJwt } from "../../middleware/auth";
import { dto } from "./product-templates";
import { StocktakeService } from "../../services/StocktakeService";
import { DraftKitError } from "../../services/ProductTemplateService";
class SessionDto {
  @IsString() @MinLength(1) @MaxLength(200) name!: string;
  @IsString() @MaxLength(5000) notes: string = "";
  @IsArray() targets!: unknown[];
}
class EditDto extends SessionDto { @IsInt() @Min(1) revision!: number; }
class RevisionDto { @IsInt() @Min(1) revision!: number; }
class ReviewDto extends RevisionDto {
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @IsBoolean() allow_partial: boolean = false;
}
class CountDto extends RevisionDto {
  @IsUUID() item_id!: string;
  @IsString() @MinLength(1) @MaxLength(100) location!: string;
  @IsString() @MinLength(1) @MaxLength(20) quantity!: string;
  @IsString() @MinLength(1) @MaxLength(30) unit!: string;
  @IsBoolean() remove: boolean = false;
}
export const stocktakeCounters = new Set(["admin","super_admin","manager","inventory_staff","staff"]);
export const stocktakeReviewers = new Set(["admin","super_admin","manager","inventory_staff"]);
export const stocktakeApprovers = new Set(["admin","super_admin","manager"]);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function stocktakeRouter(db: DataSource) {
  const router=Router();const service=new StocktakeService(db);
  const action=(run:RequestHandler):RequestHandler=>(req,res,next)=>{Promise.resolve(run(req,res,next)).catch((e:unknown)=>{
    if(e instanceof DraftKitError)res.status(e.status).json({error:e.message});
    else if(e&&typeof e==="object"&&"code"in e&&["23505","23514","P0001","40001","40P01"].includes(String(e.code)))res.status(409).json({error:"Concurrent stock change; reopen and retry"});
    else {console.error("Physical stock operation failed",e instanceof Error?e.name:"Error");res.status(500).json({error:"Unable to process physical stock"});}
  });};
  router.use((req,res,next)=>{if(!req.headers.authorization?.startsWith("Bearer ")){res.status(401).json({error:"Sign in required"});return;}next();},authenticateJwt);
  router.use(action(async(req,res,next)=>{
    const u=req.user;if(!u?.orgId||!uuid.test(u.orgId)||u.orgId==="00000000-0000-0000-0000-000000000000"||!uuid.test(u.id)){res.status(403).json({error:"Explicit organization required"});return;}
    const current=await db.getRepository(User).findOneBy({id:u.id,organization_id:u.orgId,is_active:true});
    if(!current){res.status(403).json({error:"Organization access denied"});return;}u.role=current.role;
    const read=["GET","HEAD","OPTIONS"].includes(req.method);
    const required=/\/(approve|post)\/?$/.test(req.path)?stocktakeApprovers:/\/(review|reopen)\/?$/.test(req.path)?stocktakeReviewers:stocktakeCounters;
    if(read ? !stocktakeCounters.has(current.role)&&current.role!=="viewer"&&current.role!=="project_staff"&&current.role!=="editor" : !required.has(current.role)){
      res.status(403).json({error:"Stocktake permission denied"});return;
    }next();
  }));
  router.param("id",(_req,res,next,id:string)=>{if(!uuid.test(id)){res.status(400).json({error:"Invalid stocktake identity"});return;}next();});
  router.get("/inventory",action(async(req,res)=>{res.json(await service.inventory(req.user!.orgId!));}));
  router.get("/ledger",action(async(req,res)=>{
    const item=req.query.item;if(item!==undefined&&(typeof item!=="string"||!uuid.test(item)))throw new DraftKitError(400,"Invalid inventory identity");
    res.json(await service.ledger(req.user!.orgId!,item as string|undefined));
  }));
  router.get("/",action(async(req,res)=>{res.json(await service.list(req.user!.orgId!));}));
  router.post("/",action(async(req,res)=>{const d=await dto(req.body,SessionDto);res.status(201).json(await service.create(req.user!.orgId!,req.user!.id,d.name,d.notes,d.targets));}));
  router.get("/:id",action(async(req,res)=>{res.json(await service.view(req.user!.orgId!,req.params.id));}));
  router.get("/:id/history",action(async(req,res)=>{res.json(await service.history(req.user!.orgId!,req.params.id));}));
  router.put("/:id",action(async(req,res)=>{const d=await dto(req.body,EditDto);res.json(await service.edit(req.user!.orgId!,req.params.id,req.user!.id,d.revision,d.name,d.notes,d.targets));}));
  router.put("/:id/count",action(async(req,res)=>{const d=await dto(req.body,CountDto);res.json(await service.count(req.user!.orgId!,req.params.id,req.user!.id,d.revision,d.item_id,d.location,d.quantity,d.unit,d.remove));}));
  router.post("/:id/review",action(async(req,res)=>{const d=await dto(req.body,ReviewDto);res.json(await service.transition(req.user!.orgId!,req.params.id,req.user!.id,d.revision,"review",d.reason,d.allow_partial));}));
  for(const verb of ["approve","post","reopen"] as const) router.post(`/:id/${verb}`,action(async(req,res)=>{
    const d=await dto(req.body,RevisionDto);res.json(await service.transition(req.user!.orgId!,req.params.id,req.user!.id,d.revision,verb,""));
  }));
  return router;
}
