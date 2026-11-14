import { Router, raw, type RequestHandler, type ErrorRequestHandler } from "express";
import type { DataSource, EntityManager } from "typeorm";
import { randomUUID, createHash } from "node:crypto";
import { resolve } from "node:path";
import { authenticateJwt } from "../../middleware/auth";
import { User } from "../../entity/User";
import { DraftKitError } from "../../services/ProductTemplateService";
import { PrivateAttachmentStore, attachmentDigest, attachmentLimit, validateAttachment } from "../../services/PrivateAttachmentStore";

const uuid = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const writers = new Set(["admin","super_admin","manager","staff","inventory_staff","production_staff","project_staff","editor"]);
interface Attachment { id:string; organization_id:string; name:string; mime:string; digest:string; size:number; input_hash:string }
export function attachmentRouter(db: DataSource, store = new PrivateAttachmentStore(resolve(process.env.ATTACHMENT_STORAGE_ROOT ?? ".local-dev/attachments"))) {
  const r = Router();
  const run = (fn: RequestHandler): RequestHandler => (req,res,next) => { Promise.resolve(fn(req,res,next)).catch(next); };
  r.use((req,res,next)=>{if(!req.headers.authorization?.startsWith("Bearer ")) {res.status(401).json({error:"Sign in required"});return;}next();},authenticateJwt);
  r.use(run(async(req,res,next)=>{
    const u=req.user;
    if(!u?.orgId || !uuid.test(u.orgId) || !uuid.test(u.id) || u.orgId==="00000000-0000-0000-0000-000000000000") throw new DraftKitError(403,"Explicit organization required");
    const current=await db.getRepository(User).findOneBy({id:u.id,organization_id:u.orgId,is_active:true});
    if(!current || !writers.has(current.role) && current.role!=="viewer" || req.method!=="GET" && !writers.has(current.role)) throw new DraftKitError(403,"Attachment permission denied");
    u.role=current.role; res.setHeader("Cache-Control","private, no-store");next();
  }));
  async function project(m:EntityManager,org:string,id:string,write=false) {
    if(!uuid.test(id)) throw new DraftKitError(400,"Invalid project identity");
    if(!(await m.query(`SELECT id FROM planning_projects WHERE id=$1 AND organization_id=$2 AND archived_at IS NULL ${write?"FOR UPDATE":""}`,[id,org])).length) throw new DraftKitError(404,"Project unavailable");
    if(write && (await m.query("SELECT id FROM project_completions WHERE project_id=$1 AND organization_id=$2 AND status='closed'",[id,org])).length) throw new DraftKitError(409,"Reopen project before uploading");
  }
  r.get("/projects/:id",run(async(req,res)=>{
    const org=req.user!.orgId!; await project(db.manager,org,req.params.id);
    res.json(await db.query("SELECT id,project_id,site_id,related_kind,related_id,name,mime,size,digest,created_by,created_at FROM private_attachments WHERE organization_id=$1 AND project_id=$2 ORDER BY created_at,id",[org,req.params.id]));
  }));
  r.post("/projects/:id",raw({type:()=>true,limit:attachmentLimit}),run(async(req,res)=>{
    const org=req.user!.orgId!,actor=req.user!.id,key=req.header("Idempotency-Key")??"",mime=req.header("Content-Type")?.split(";")[0]??"";
    let name:string;try{name=decodeURIComponent(req.header("X-Attachment-Name")??"");}catch{throw new DraftKitError(400,"Invalid attachment filename encoding");}
    const kind=req.header("X-Record-Kind")??"project",site=req.header("X-Site-Id")??null,related=req.header("X-Record-Id")??null;
    if(!key || key.length>128 || !["project","survey","installation","delivery"].includes(kind) || site!==null&&!uuid.test(site) || related!==null&&!uuid.test(related) || ["installation","delivery"].includes(kind)&&(!site||!related) || kind==="survey"&&!site || kind==="project"&&(site||related)) throw new DraftKitError(400,"Invalid attachment metadata");
    if(!Buffer.isBuffer(req.body)) throw new DraftKitError(400,"Binary upload required");
    try { validateAttachment(req.body,name,mime); } catch(e) { throw new DraftKitError(400,(e as Error).message); }
    const bytes:Buffer=req.body,digest=attachmentDigest(bytes),input=createHash("sha256").update(JSON.stringify([req.params.id,kind,site,related,name,mime,digest])).digest("hex");
    const attachment=await db.transaction(async m=>{
      await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`${org}:${actor}:${key}`]);
      await project(m,org,req.params.id,true);
      const prior:Attachment[] = await m.query("SELECT * FROM private_attachments WHERE organization_id=$1 AND created_by=$2 AND idempotency_key=$3",[org,actor,key]);
      if(prior.length){if(prior[0].input_hash!==input)throw new DraftKitError(409,"Idempotency key already used for different upload");return prior[0];}
      if(site && !(await m.query("SELECT id FROM planning_sites WHERE id=$1 AND project_id=$2 AND organization_id=$3",[site,req.params.id,org])).length) throw new DraftKitError(404,"Site unavailable");
      if(related && ["installation","delivery"].includes(kind)) {
        const table=kind==="installation"?"site_installations":"delivery_orders";
        if(!(await m.query(`SELECT id FROM ${table} WHERE id=$1 AND project_id=$2 AND site_id=$3 AND organization_id=$4`,[related,req.params.id,site,org])).length)throw new DraftKitError(404,"Related record unavailable");
      } else if(related)throw new DraftKitError(400,"Unexpected related record");
      const id=randomUUID();await store.put(org,id,bytes);
      const rows:Attachment[]=await m.query("INSERT INTO private_attachments(id,organization_id,project_id,site_id,related_kind,related_id,name,mime,size,digest,created_by,idempotency_key,input_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",[id,org,req.params.id,site,kind,related,name,mime,bytes.length,digest,actor,key,input]);
      await m.query("INSERT INTO private_attachment_events(organization_id,attachment_id,actor_id,action) VALUES($1,$2,$3,'upload')",[org,id,actor]);return rows[0];
    });
    res.status(201).json({id:attachment.id,name:attachment.name,mime:attachment.mime,size:attachment.size,digest:attachment.digest});
  }));
  r.get("/:id/download",run(async(req,res)=>{
    if(!uuid.test(req.params.id))throw new DraftKitError(400,"Invalid attachment identity");
    const rows:Attachment[]=await db.query("SELECT * FROM private_attachments WHERE id=$1 AND organization_id=$2",[req.params.id,req.user!.orgId]);
    if(!rows.length)throw new DraftKitError(404,"Attachment unavailable");
    const a=rows[0],bytes=await store.get(a.organization_id,a.id,a.digest,a.size);
    await db.query("INSERT INTO private_attachment_events(organization_id,attachment_id,actor_id,action) VALUES($1,$2,$3,'download')",[a.organization_id,a.id,req.user!.id]);
    res.setHeader("Content-Type",a.mime);res.setHeader("X-Content-Type-Options","nosniff");res.setHeader("Content-Security-Policy","sandbox; default-src 'none'");
    res.setHeader("Content-Disposition",`attachment; filename="attachment"; filename*=UTF-8''${encodeURIComponent(a.name)}`);res.send(bytes);
  }));
  r.use(((e:unknown,_req,res,_next)=>{
    const oversized=e && typeof e==="object" && "type" in e && e.type==="entity.too.large";
    res.status(e instanceof DraftKitError?e.status:oversized?413:500).json({error:e instanceof DraftKitError?e.message:oversized?"Attachment exceeds 10 MiB":"Attachment operation unavailable"});
  }) as ErrorRequestHandler);
  return r;
}
