import { randomUUID } from 'node:crypto';
import type { EntityManager } from 'typeorm';
import { CommitmentLedgerService, type LedgerContext } from './CommitmentLedgerService';
import { dispatchAssembly } from '../features/delivery/trustedDeliveryContract';
import type { PackingSnapshot } from '../features/packing/packingPlan';
import type { PlanningContent, DemandLine } from '../features/projects/planningTypes';

export interface DispatchInput { plan: string; roots: string[]; transport: { carrier: string; vehicle: string; planned_date: string; notes: string } }
export interface DeliveryInput { dispatch: string; roots: string[]; recipient: string; acknowledged_at: string; acknowledgement: string; source: string }
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function exact(i: object,keys: string[],ids: string[]) {
  if(!i||Object.keys(i).length!==keys.length||Object.keys(i).some(k=>!keys.includes(k))||ids.some(id=>!uuid.test(id))) throw Error('Exact delivery identity required');
}
async function audit(m:EntityManager,c:LedgerContext,table:string,row:Record<string,unknown>) {
  await m.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after") VALUES($1,$2,$3,$4,'trusted_delivery',$5,$6::jsonb)`,[randomUUID(),c.organization,c.actor,table,row.id,JSON.stringify(row)]);
  return row;
}
export async function dispatchPacking(m:EntityManager,c:LedgerContext,i:DispatchInput,key:string):Promise<Record<string,unknown>> {
  exact(i,['plan','roots','transport'],[i.plan]);
  if(!Array.isArray(i.roots)||i.roots.some(id=>!uuid.test(id))) throw Error('Physical assembly identities required');
  const [p]:{id:string;project_id:string;site_id:string;approval_id:string;demand_revision:number;snapshot:PackingSnapshot}[]=await m.query('SELECT * FROM trusted_packing_plans WHERE id=$1 AND organization_id=$2',[i.plan,c.organization]);
  if(!p) throw Error('Tenant packing plan required');
  await m.query('SELECT requirement_assert($1,$2,$3,$4,$5)',[c.organization,p.project_id,p.site_id,p.demand_revision,p.approval_id]);
  await m.query("SELECT pg_advisory_xact_lock(hashtextextended('dispatch:'||$1,0))",[p.project_id]);
  const assembly=dispatchAssembly(p.snapshot,i.roots),id=randomUUID();
  const [{receipt}]=await m.query(`INSERT INTO trusted_dispatches(id,organization_id,plan_id,roots,transport,actor_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING to_jsonb(trusted_dispatches)-'created_at' receipt`,[id,c.organization,p.id,JSON.stringify(i.roots),JSON.stringify(i.transport),c.actor,key]);
  const [{snapshot}]:{snapshot:{content:PlanningContent;lines:DemandLine[]}}[]=await m.query('SELECT snapshot FROM requirement_approvals WHERE id=$1 AND organization_id=$2',[p.approval_id,c.organization]);
  const ledger=new CommitmentLedgerService(m),byId=new Map(assembly.packages.map(p=>[p.id,p]));
  for(const pack of assembly.packages) {
    let root=pack;while(!assembly.roots.includes(root.id)) root=byId.get(root.parent_id!)!;
    const slot=assembly.slots.find(s=>s.package===pack.id);
    let account:string|null=null,entitlement:string|null=null,claim:string|null=null;
    if(slot) {
      const selector={selection:slot.selection,[slot.kind]:slot.definition};
      const [old]=await m.query("SELECT id FROM commitment_accounts WHERE organization_id=$1 AND project_id=$2 AND site_id=$3 AND dimension='slot' AND selector=$4::jsonb",[c.organization,p.project_id,p.site_id,JSON.stringify(selector)]);
      account=old?.id??await ledger.createAccount(c,{project:p.project_id,site:p.site_id,obligation:`deliverable:${slot.selection}:${slot.kind}:${slot.definition}`,dimension:'slot',item:'',unit:'slots',selector});
      const proof=slot.kind==='grade'?snapshot.content.sites.find(s=>s.id===p.site_id)?.selections.find(s=>s.id===slot.selection):snapshot.lines.find(l=>l.site_id===p.site_id&&l.selection_id===slot.selection&&l.owner_id===slot.definition&&l.source==='crate'&&!('material_id' in l));
      if(!proof) throw Error('Frozen school entitlement required');
      const cap=slot.kind==='grade'?('context' in proof?proof.context.grade_quantities[slot.definition]:undefined):('quantity' in proof?proof.quantity:undefined);
      if(!Number.isSafeInteger(cap)||Number(cap)<1) throw Error('Positive whole approved slots required');
      const [prior]=await m.query('SELECT id FROM commitment_entitlements WHERE account_id=$1 AND approval_id=$2',[account,p.approval_id]);
      entitlement=prior?.id??await ledger.entitlement(c,account!,p.approval_id,p.demand_revision,String(cap),proof);
      const [balance]=await m.query('SELECT entitlement_id FROM commitment_balances WHERE account_id=$1',[account]);
      if(balance.entitlement_id!==entitlement)await ledger.executeInTransaction(m,c,account!,entitlement!,randomUUID(),'Authorize approved school deliverable',{kind:'authorize',payload:{}});
      claim=randomUUID();
      await ledger.executeInTransaction(m,c,account!,entitlement!,randomUUID(),'Exclusive school dispatch custody',{kind:'open',payload:{claim,quantity:'1',source:{kind:'synthetic:school_dispatch',id,slice:pack.id}}});
    }
    await m.query(`INSERT INTO trusted_dispatch_units(id,organization_id,dispatch_id,plan_id,package_id,root_id,account_id,entitlement_id,claim_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[randomUUID(),c.organization,id,p.id,pack.id,root.id,account,entitlement,claim]);
  }
  return audit(m,c,'trusted_dispatches',receipt);
}
export async function acknowledgeDelivery(m:EntityManager,c:LedgerContext,i:DeliveryInput,key:string):Promise<Record<string,unknown>> {
  exact(i,['dispatch','roots','recipient','acknowledged_at','acknowledgement','source'],[i.dispatch,i.source]);
  if(!Array.isArray(i.roots)||i.roots.length<1||i.roots.some(id=>!uuid.test(id))) throw Error('Acknowledged assemblies required');
  const [{receipt}]=await m.query(`INSERT INTO trusted_delivery_receipts(id,organization_id,dispatch_id,roots,recipient,acknowledged_at,acknowledgement,source,actor_id,operation_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING to_jsonb(trusted_delivery_receipts)-'created_at' receipt`,[randomUUID(),c.organization,i.dispatch,JSON.stringify(i.roots),i.recipient,i.acknowledged_at,i.acknowledgement,i.source,c.actor,key]);
  const units:{account_id:string;entitlement_id:string;claim_id:string}[]=await m.query('SELECT account_id,entitlement_id,claim_id FROM trusted_dispatch_units WHERE organization_id=$1 AND dispatch_id=$2 AND root_id=ANY($3::uuid[]) AND claim_id IS NOT NULL ORDER BY account_id,claim_id',[c.organization,i.dispatch,i.roots]);
  const ledger=new CommitmentLedgerService(m);
  for(const u of units) await ledger.executeInTransaction(m,c,u.account_id,u.entitlement_id,randomUUID(),'Evidenced school acknowledgment',{kind:'consume',payload:{claim:u.claim_id,quantity:'1'}});
  return audit(m,c,'trusted_delivery_receipts',receipt);
}
