import type { Router, RequestHandler } from 'express';
import type { DataSource } from 'typeorm';
import type { TrustedLedgerAuthority } from '../../security/TrustedLedgerAuthority';
import { trustedProjectProgress } from '../../services/TrustedCompletionService';

/** Mounted after authenticated tenant/session middleware; no client ownership fields. */
export function trustedDeliveryRoutes(r:Router,db:DataSource,authority:TrustedLedgerAuthority|undefined,action:(h:RequestHandler)=>RequestHandler) {
  r.get('/trusted-delivery',action(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const [{installed}]=await db.query("SELECT to_regclass('trusted_dispatches') IS NOT NULL installed");
    if(!authority||!installed){res.json({enabled:false,dispatches:[]});return;}
    res.json(await db.transaction('REPEATABLE READ',async m=>({enabled:true,dispatches:await m.query(`SELECT d.*,p.project_id,p.site_id,p.approval_id,p.demand_revision,p.snapshot,
      (SELECT coalesce(jsonb_agg(u),'[]') FROM trusted_dispatch_units u WHERE u.dispatch_id=d.id) units,
      (SELECT coalesce(jsonb_agg(q ORDER BY q.created_at),'[]') FROM trusted_delivery_receipts q WHERE q.dispatch_id=d.id) receipts
      FROM trusted_dispatches d JOIN trusted_packing_plans p ON p.id=d.plan_id WHERE d.organization_id=$1 ORDER BY d.created_at DESC LIMIT 100`,[req.user!.orgId])})));
  }));
  r.get('/trusted-delivery/projects/:project/progress',action(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    const [{installed}]=await db.query("SELECT to_regclass('trusted_installation_sources') IS NOT NULL installed");
    if(!authority||!installed){res.status(503).json({error:'Trusted lifecycle unavailable'});return;}
    res.json(await db.transaction('REPEATABLE READ',m=>trustedProjectProgress(m,req.user!.orgId,req.params.project as string)));
  }));
  for(const [path,kind] of [['dispatches','dispatchPacking'],['acknowledgments','acknowledgeDelivery'],['installations','createTrustedInstallation'],['installation-actions','trustedInstallationAction'],['closure','closeTrustedProject']] as const)
    r.post(`/operator/delivery/${path}`,action(async(req,res)=>{
      if(!['admin','super_admin'].includes(req.user!.role)){res.status(403).json({error:'Active tenant administrator required'});return;}
      const [{installed}]=await db.query("SELECT to_regclass('trusted_dispatches') IS NOT NULL installed");
      if(!authority||!installed){res.status(503).json({error:'Trusted delivery unavailable'});return;}
      try{res.status(201).json(await authority.performProductionForSession(req.headers.authorization!.slice(7),{action:kind,key:req.header('Idempotency-Key')!,input:req.body}));}
      catch{res.status(409).json({error:'Delivery denied: refresh current school, approval, complete QC assembly and outstanding receipt evidence before changing this request.'});}
    }));
}
