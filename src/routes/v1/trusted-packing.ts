import type { Router, RequestHandler } from "express";
import type { DataSource } from "typeorm";
import type { TrustedLedgerAuthority } from "../../security/TrustedLedgerAuthority";

/** Mounted after production's authenticated tenant middleware. */
export function trustedPackingRoutes(r: Router,db: DataSource,authority: TrustedLedgerAuthority|undefined,action: (h:RequestHandler)=>RequestHandler) {
  r.get('/trusted-packing',action(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const [{installed}]=await db.query("SELECT to_regclass('trusted_packing_plans') IS NOT NULL installed");
    if(!authority||!installed){res.json({enabled:false,plans:[],outputs:[]});return;}
    // One repeatable snapshot prevents a QC receipt being shown against older allocations.
    const view=await db.transaction('REPEATABLE READ',async m=>({enabled:true,
      plans:await m.query(`SELECT p.*,
        (SELECT coalesce(jsonb_agg(to_jsonb(a)||jsonb_build_object('quantity',a.quantity::text) ORDER BY a.created_at),'[]') FROM trusted_packing_allocations a WHERE a.plan_id=p.id) allocations,
        (SELECT coalesce(jsonb_agg(q ORDER BY q.created_at),'[]') FROM trusted_packing_qc q WHERE q.plan_id=p.id) inspections
        FROM trusted_packing_plans p WHERE p.organization_id=$1
        ORDER BY EXISTS(SELECT 1 FROM jsonb_array_elements(p.snapshot->'packages') x WHERE x->>'id'=$2) DESC,p.created_at DESC LIMIT 100`,[req.user!.orgId,typeof req.query.package==='string'?req.query.package:'']),
      outputs:await m.query(`SELECT o.*,w.project_id,w.site_id,w.demand_revision,w.recipe_id,c.approval_id,c.demand_line,
        (o.quantity-coalesce((SELECT sum(a.quantity) FROM trusted_packing_allocations a WHERE a.output_id=o.id),0))::text available
        FROM production_output_custody o JOIN production_work_orders w ON w.id=o.order_id
        JOIN commitment_work_orders c ON c.order_id=w.id WHERE o.organization_id=$1 ORDER BY o.created_at DESC LIMIT 500`,[req.user!.orgId])}));
    res.json(view);
  }));
  for(const [path,kind] of [['plans','createPackingPlan'],['allocations','allocatePackingOutput'],['inspections','inspectPacking']] as const)
    r.post(`/operator/packing/${path}`,action(async(req,res)=>{
      if(!['admin','super_admin'].includes(req.user!.role)){res.status(403).json({error:'Active tenant administrator required'});return;}
      if(!authority){res.status(503).json({error:'Trusted packing unavailable'});return;}
      try {res.status(201).json(await authority.performProductionForSession(req.headers.authorization!.slice(7),
        {action:kind,key:req.header('Idempotency-Key')!,input:req.body}));}
      catch {res.status(409).json({error:'Packing denied: verify current school, available output, package coverage and all six QC evidence fields. Refresh and reconcile before changing this request.'});}
    }));
}
