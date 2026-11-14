import {Router,type RequestHandler,type ErrorRequestHandler} from "express";
import type {DataSource} from "typeorm";
import {createHash} from "node:crypto";
import {authenticateJwt} from "../../middleware/auth";
import {User} from "../../entity/User";
import {DraftKitError} from "../../services/ProductTemplateService";
import {defaultLabelTemplate,validateLabelTemplate} from "../../features/packing/packingLabelTemplate";
export function labelLayoutRouter(db:DataSource){
  const r=Router(),run=(fn:RequestHandler):RequestHandler=>(req,res,next)=>{Promise.resolve(fn(req,res,next)).catch(next);};
  r.use((req,res,next)=>{if(!req.headers.authorization?.startsWith("Bearer ")){res.status(401).json({error:"Sign in required"});return;}next();},authenticateJwt);
  r.use(run(async(req,res,next)=>{
    const u=req.user;
    if(!u?.orgId||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(u.orgId)||u.orgId==="00000000-0000-0000-0000-000000000000")throw new DraftKitError(403,"Explicit organization required");
    const current=await db.getRepository(User).findOneBy({id:u.id,organization_id:u.orgId,is_active:true});
    if(!current||!["admin","super_admin","manager","staff","inventory_staff","production_staff","project_staff","editor","viewer"].includes(current.role)||req.method!=="GET"&&!["admin","super_admin","manager"].includes(current.role))throw new DraftKitError(403,"Label layout permission denied");
    u.role=current.role;res.setHeader("Cache-Control","private, no-store");next();
  }));
  r.get("/",run(async(req,res)=>{const rows=await db.query("SELECT revision,template,created_by,created_at FROM organization_label_layouts WHERE organization_id=$1 ORDER BY revision DESC LIMIT 1",[req.user!.orgId]);res.json(rows[0]??{revision:0,template:defaultLabelTemplate});}));
  r.get("/history",run(async(req,res)=>{res.json(await db.query("SELECT revision,template,created_by,created_at FROM organization_label_layouts WHERE organization_id=$1 ORDER BY revision DESC",[req.user!.orgId]));}));
  r.post("/",run(async(req,res)=>{
    const org=req.user!.orgId!,actor=req.user!.id,key=req.header("Idempotency-Key")??"",expected=req.body?.expectedRevision;
    if(!key||key.length>128||!Number.isSafeInteger(expected)||expected<0)throw new DraftKitError(400,"Valid expected revision and idempotency key required");
    let template;try{template=validateLabelTemplate(req.body?.template);}catch(e){throw new DraftKitError(400,(e as Error).message);}
    const input=createHash("sha256").update(JSON.stringify([expected,template])).digest("hex");
    const row=await db.transaction(async m=>{
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`label-layout:${org}`]);
      const prior=await m.query("SELECT revision,template,created_by,created_at,input_hash FROM organization_label_layouts WHERE organization_id=$1 AND created_by=$2 AND idempotency_key=$3",[org,actor,key]);
      if(prior.length){if(prior[0].input_hash!==input)throw new DraftKitError(409,"Idempotency key already used for a different layout");const {input_hash:_hash,...result}=prior[0];return result;}
      const latest=await m.query("SELECT revision FROM organization_label_layouts WHERE organization_id=$1 ORDER BY revision DESC LIMIT 1",[org]);
      if((latest[0]?.revision??0)!==expected)throw new DraftKitError(409,"Layout changed; reload the organization layout before saving");
      return (await m.query("INSERT INTO organization_label_layouts(organization_id,revision,template,created_by,idempotency_key,input_hash) VALUES($1,$2,$3,$4,$5,$6) RETURNING revision,template,created_by,created_at",[org,expected+1,template,actor,key,input]))[0];
    });res.status(201).json(row);
  }));
  r.use(((e:unknown,_req,res,_next)=>{res.status(e instanceof DraftKitError?e.status:500).json({error:e instanceof DraftKitError?e.message:"Label layout unavailable"});}) as ErrorRequestHandler);
  return r;
}
