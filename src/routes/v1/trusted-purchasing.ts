import { Router } from "express";
import type { DataSource } from "typeorm";
import type { LedgerRequest, TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";

type Purchasing = Extract<LedgerRequest,{action:"purchaseRequest"|"purchaseOrder"}>;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Mounted behind supply authentication, live tenant role checks and operation-key validation. */
export function trustedPurchasingRouter(db:DataSource,authority?:TrustedLedgerAuthority) {
  const router=Router();
  router.get("/trusted-purchasing",async(req,res,next)=>{
    try {
      res.setHeader("Cache-Control","no-store");
      if(!authority){res.json({enabled:false,demand:[],requests:[],orders:[],sources:[]});return;}
      const org=req.user!.orgId;
      const demand=await db.query(`SELECT a.project_id AS project,l->>'site_id' AS site,
        l->>'inventory_item_id' AS item,l->>'unit' AS unit,a.id AS approval,a.revision AS "demandRevision",
        sum((l->>'quantity')::numeric)::text AS quantity
        FROM requirement_approvals a JOIN planning_projects p ON p.id=a.project_id AND p.organization_id=a.organization_id
        CROSS JOIN LATERAL jsonb_array_elements(a.snapshot->'lines') l
        WHERE a.organization_id=$1 AND p.revision=a.revision AND p.archived_at IS NULL AND l ? 'material_id'
        AND l->>'inventory_item_id' IS NOT NULL
        GROUP BY a.project_id,l->>'site_id',l->>'inventory_item_id',l->>'unit',a.id,a.revision`,[org]);
      const requests=await db.query(`SELECT r.id,r.revision,r.status,b.line_id AS line,a.project_id AS project,
        a.site_id AS site,a.item_key AS item,a.unit,e.approval_id AS approval,e.revision AS "demandRevision"
        FROM commitment_pr_lines b JOIN purchase_requests r ON r.id=b.request_id
        JOIN commitment_accounts a ON a.id=b.account_id JOIN commitment_entitlements e ON e.id=b.entitlement_id
        WHERE b.organization_id=$1 ORDER BY r.created_at,r.id`,[org]);
      const orders=await db.query(`SELECT p.id,p.planning_revision AS revision,p.status,p.reviewed_by,
        b.request_id AS request,b.request_revision AS "requestRevision",b.line_id AS line,
        a.project_id AS project,a.site_id AS site,a.item_key AS item,a.unit,e.approval_id AS approval,e.revision AS "demandRevision"
        FROM commitment_po_lines b JOIN purchase_orders p ON p.id=b.order_id
        JOIN commitment_accounts a ON a.id=b.account_id JOIN commitment_entitlements e ON e.id=b.entitlement_id
        WHERE b.organization_id=$1 ORDER BY p.id`,[org]);
      const sources=await db.query(`SELECT c.id AS claim,c.source_slice AS slice,c.source_id AS line,
        trim_scale(c.held-coalesce((SELECT max(end_quantity) FROM commitment_po_coverage WHERE claim_id=c.id),0))::text AS remaining
        FROM commitment_claims c WHERE c.organization_id=$1 AND c.source_kind='purchase_request_line'
        AND NOT c.retired AND c.parent_id IS NULL AND c.fulfilled=0 AND c.held>0 ORDER BY c.id`,[org]);
      res.json({enabled:true,demand,requests,orders,sources});
    } catch(error){next(error);}
  });
  for(const [kind,action] of [["requests","purchaseRequest"],["orders","purchaseOrder"]] as const) {
    router.post(`/operator/${kind}/:id/:transition(create|review|approve)`,async(req,res)=>{
      if(!["admin","super_admin"].includes(req.user!.role)){res.status(403).json({error:"Purchasing administrator required"});return;}
      if(!authority){res.status(503).json({error:"Trusted purchasing authority unavailable"});return;}
      const i=req.body,t=req.params.transition,creating=t==="create",order=action==="purchaseOrder";
      const fields=["project","site","item","unit","approval","demandRevision","id","reason","transition",
        ...(creating?(order?["vendor","sources"]:["line","quantity","basis"]):["revision"]),
        ...(order?["request","requestRevision","line"]:[])];
      const ids=["project","site","item","approval","id",...(creating||order?["line"]:[]),...(order?["request",...(creating?["vendor"]:[])]:[])];
      const positive=(x:unknown)=>typeof x==="string"&&x.length<=20&&/^\d+(\.\d{1,4})?$/.test(x)&&Number(x)>0;
      if(!i||typeof i!=="object"||Array.isArray(i)||Object.keys(i).some(k=>!fields.includes(k))||
        !["create","review","approve"].includes(t)||i.transition!==t||i.id!==req.params.id||ids.some(k=>typeof i[k]!=="string"||!uuid.test(i[k]))||
        typeof i.unit!=="string"||!i.unit.trim()||i.unit.length>30||typeof i.reason!=="string"||!i.reason.trim()||i.reason.length>1000||
        !Number.isSafeInteger(i.demandRevision)||i.demandRevision<1||(!creating&&(!Number.isSafeInteger(i.revision)||i.revision<1))||
        (order&&(!Number.isSafeInteger(i.requestRevision)||i.requestRevision<1))||
        (creating&&!order&&(!positive(i.quantity)||!["manual","shortage"].includes(i.basis)))||
        (creating&&order&&(!Array.isArray(i.sources)||!i.sources.length||i.sources.length>100||i.sources.some((s:any)=>!s||Object.keys(s).some(k=>!["claim","slice","quantity"].includes(k))||typeof s.claim!=="string"||!uuid.test(s.claim)||typeof s.slice!=="string"||!s.slice||s.slice.length>100||!positive(s.quantity))))) {
        res.status(400).json({error:"Exact purchasing source, revision and operation required"});return;
      }
      try {
        const request={action,key:req.header("Idempotency-Key")!,input:i} as Purchasing;
        res.status(creating?201:200).json(await authority.performPurchasingForSession(req.headers.authorization!.slice(7),request));
      } catch {res.status(409).json({error:"Purchasing authorization or state conflict; reconcile before changing the saved request"});}
    });
  }
  return router;
}
