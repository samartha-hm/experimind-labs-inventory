import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { InventoryItem } from '../../entity/InventoryItem';
import { StocktakeService } from '../../services/StocktakeService';
import type { TrustedLedgerAuthority, LedgerRequest } from '../../security/TrustedLedgerAuthority';
import type { verifyWorkOrderAuthority } from './workOrderAuthority.cases';
import type { PackingSnapshot } from '../../features/packing/packingPlan';
import { qcChecks } from '../../features/packing/packingTypes';
import type { WorkOrderResult } from '../../services/WorkOrderAuthorityService';
import { AuthService } from '../../services/AuthService';
import { User } from '../../entity/User';
import { allocatePackingOutput } from '../../services/TrustedPackingService';

export async function verifyPackingAuthority(h:Parameters<typeof verifyWorkOrderAuthority>[0],authority:TrustedLedgerAuthority,token:string,base:string) {
  const f=await h.fixture();
  const [{item_key:output}]:{item_key:string}[]=await h.db.query('SELECT item_key FROM commitment_accounts WHERE id=$1',[f.account]);
  const input=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:'Packing proof input',unit:'g',sku:randomUUID(),base_price:0,quantity:0,threshold:0});
  const perform=async(r:LedgerRequest)=>authority.perform(await authority.issue(token,r),r);
  const recipe=await perform({action:'publishRecipe',key:randomUUID(),input:{name:'Packing proof recipe',definition:{output_item_id:output,unit:'m',yield_quantity:'0.2',instructions:'',specification:'',concentration:'',inputs:[{item_id:input.id,quantity:'1',canonical_quantity:'1',unit:'g',scrap_percent:'0'}]}}});
  const order=await perform({action:'claimWorkOrder',key:randomUUID(),input:{project:f.project.id,site:f.site,approval:f.approval.id,demandRevision:1,recipe:(recipe as {id:string}).id,quantity:'0.2',unit:'m',source:randomUUID()}}) as WorkOrderResult;
  const stocktake=new StocktakeService(h.db);
  let count=await stocktake.create(h.admin.organization_id,h.admin.id,'Packing input count','',[{item_id:input.id,locations:['Packing input'],complete_coverage:true}]);
  count=await stocktake.count(h.admin.organization_id,count.id,h.admin.id,count.revision,input.id,'Packing input','1','g');
  for(const action of ['review','approve','post'] as const)count=await stocktake.transition(h.admin.organization_id,count.id,h.admin.id,count.revision,action,'Synthetic packing evidence');
  await perform({action:'issueWorkOrder',key:randomUUID(),input:{order:order.id,material:order.materials[0].id,source:randomUUID(),quantity:'1',unit:'g',location:'Packing input',reason:'Synthetic packing evidence'}});
  const finished=await authority.performProductionForSession(token,{action:'recordFinishedOutput',key:randomUUID(),input:{order:order.id,source:randomUUID(),quantity:'0.2000',unit:'m',location:'Packing shelf'}});
  const unchanged=async()=>JSON.stringify(await h.db.query(`SELECT (SELECT jsonb_agg(t ORDER BY id) FROM stock_ledger t) stock,(SELECT jsonb_agg(t ORDER BY account_id) FROM commitment_balances t) balances`));
  const before=await unchanged();
  async function send(path:string,body:unknown,key=randomUUID(),statuses=[201],access=token) {
    const res=await fetch(`${base}/operator/packing/${path}`,{method:'POST',headers:{Authorization:access?`Bearer ${access}`:'','Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
    const data=await res.json() as {id:string;snapshot:PackingSnapshot;quantity:string;error?:string};
    if(res.status===409&&!statuses.includes(409))await authority.performProductionForSession(token,{action:path==='plans'?'createPackingPlan':path==='allocations'?'allocatePackingOutput':'inspectPacking',key,input:body} as LedgerRequest & {action:'createPackingPlan'});
    expect(statuses,JSON.stringify(data)).toContain(res.status);return data;
  }
  const planInput={project:f.project.id,site:f.site,approval:f.approval.id,demandRevision:1},planKey=randomUUID();
  await send('plans',planInput,randomUUID(),[401],'');
  const plan=await send('plans',planInput,planKey);
  expect(await send('plans',planInput,planKey)).toEqual(plan);
  const packages=plan.snapshot.packages.filter(p=>p.materials.length);expect(packages).toHaveLength(2);
  const allocation={plan:plan.id,package:packages[0].id,output:finished.id,line:packages[0].materials[0].line_id,quantity:'0.0500'};
  const otherSite=f.project.sites.find(s=>s.id!==f.site)!;
  const otherPlan=await send('plans',{...planInput,site:otherSite.id});
  const otherPackage=otherPlan.snapshot.packages.find(p=>p.materials.length)!;
  await send('allocations',{...allocation,plan:otherPlan.id,package:otherPackage.id,line:otherPackage.materials[0].line_id},randomUUID(),[409]);
  await expect(h.writer.transaction(m=>allocatePackingOutput(m,{organization:h.admin.organization_id,actor:h.admin.id},allocation,randomUUID()))).rejects.toMatchObject({code:'23514'});
  const auth=new AuthService(h.identity),foreignPassword=randomUUID()+'Aa1!';
  await h.identity.getRepository(User).update(h.other.id,{password_hash:await auth.hashPassword(foreignPassword)});
  const foreign=(await auth.login(h.other.email,foreignPassword)).token!;
  await send('allocations',allocation,randomUUID(),[403,409],foreign);
  const foreignView=await fetch(`${base}/trusted-packing`,{headers:{Authorization:`Bearer ${foreign}`}});
  expect((await foreignView.json()).plans).toEqual([]);
  const revoked=await auth.login(h.admin.email,h.password);await auth.revokeRefreshToken(revoked.refreshToken!);
  await send('allocations',allocation,randomUUID(),[409],revoked.token!);
  const key=randomUUID(),first=await send('allocations',allocation,key);
  expect(await send('allocations',allocation,key)).toEqual(first);
  await send('allocations',{...allocation,quantity:'0.0400'},key,[409]);
  await send('allocations',allocation,key,[409],revoked.token!);
  for(const change of [{quantity:'0.0501'},{quantity:'0.00001'},{package:randomUUID()},{output:randomUUID()},{line:randomUUID()},{plan:randomUUID()}])
    await send('allocations',{...allocation,...change},randomUUID(),[409]);
  const race=await Promise.all([send('allocations',allocation,randomUUID(),[201,409]),send('allocations',allocation,randomUUID(),[201,409])]);
  expect(race.filter(r=>r.id)).toHaveLength(1);
  const checks=Object.fromEntries(qcChecks.map(name=>[name,{pass:true,evidence:`Verified ${name} on physical package`}])) as Record<typeof qcChecks[number],{pass:boolean;evidence:string}>;
  const qc={plan:plan.id,package:packages[0].id,allocationRevision:2,decision:'accept',checks,notes:'Complete physical inspection'};
  await send('inspections',{...qc,package:packages[1].id},randomUUID(),[409]);
  await send('inspections',{...qc,allocationRevision:1},randomUUID(),[409]);
  await send('inspections',{...qc,checks:{...checks,material:{pass:true,evidence:''}}},randomUUID(),[409]);
  await send('inspections',{...qc,checks:{...checks,material:{pass:false,evidence:'Failed'}}},randomUUID(),[409]);
  const qcKey=randomUUID();
  const qcRace=await Promise.all([send('inspections',qc,qcKey,[201,409]),send('inspections',qc,randomUUID(),[201,409])]);
  expect(qcRace.filter(q=>q.id)).toHaveLength(1);
  const accepted=qcRace.find(q=>q.id)!;
  // The winning immutable operation can always be retried, regardless of race order.
  const [{operation_key:acceptedKey}]=await h.db.query('SELECT operation_key FROM trusted_packing_qc WHERE id=$1',[accepted.id]);
  expect(await send('inspections',qc,acceptedKey)).toEqual(accepted);
  await send('inspections',qc,randomUUID(),[409]);
  await send('allocations',allocation,randomUUID(),[409]);
  const second={...allocation,package:packages[1].id,quantity:'0.1000'};
  // Rollback must remove allocation, audit and signed authorization together.
  for(const table of ['trusted_packing_allocations','audit_logs','commitment_authorizations']) {
    const fingerprint=async()=>JSON.stringify(await h.db.query(`SELECT (SELECT count(*) FROM trusted_packing_allocations) a,(SELECT count(*) FROM audit_logs) b,(SELECT count(*) FROM commitment_authorizations) c`));
    const prior=await fingerprint();
    await h.db.query(`CREATE FUNCTION commitment_packing_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected packing failure'; END $$; CREATE TRIGGER z_packing_failure AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION commitment_packing_test_failure()`);
    try{await send('allocations',second,randomUUID(),[409]);}finally{await h.db.query(`DROP TRIGGER z_packing_failure ON ${table}; DROP FUNCTION commitment_packing_test_failure()`);}
    expect(await fingerprint()).toBe(prior);
  }
  await send('allocations',second);
  const rejected=await send('inspections',{...qc,package:packages[1].id,allocationRevision:3,decision:'reject',checks:{...checks,packaging:{pass:false,evidence:'Damaged seal'}}});
  await send('inspections',{...qc,package:packages[1].id,allocationRevision:3},randomUUID(),[409]);
  const root=plan.snapshot.packages.find(p=>p.parent_id===null)!;
  await send('inspections',{...qc,package:root.id,allocationRevision:3},randomUUID(),[409]);
  expect(await unchanged()).toBe(before);
  for(const table of ['trusted_packing_plans','trusted_packing_allocations','trusted_packing_qc']) {
    await expect(h.runtime.query(`INSERT INTO ${table} DEFAULT VALUES`)).rejects.toMatchObject({code:'42501'});
    await expect(h.identity.query(`SELECT * FROM ${table}`)).rejects.toMatchObject({code:'42501'});
    await expect(h.writer.query(`UPDATE ${table} SET id=id`)).rejects.toMatchObject({code:'42501'});
    await expect(h.db.query(`DELETE FROM ${table}`)).rejects.toMatchObject({code:'23514'});
  }
  await expect(h.db.query("UPDATE audit_logs SET action=action WHERE entity_type='trusted_packing'")).rejects.toMatchObject({code:'23514'});
  const res=await fetch(`${base}/trusted-packing`,{headers:{Authorization:`Bearer ${token}`}});expect(res.status).toBe(200);
  const view=await res.json() as {outputs:{id:string;available:string}[]};expect(Number(view.outputs.find(o=>o.id===finished.id)!.available)).toBe(0);
  await h.db.query('UPDATE planning_projects SET revision=revision+1 WHERE id=$1',[f.project.id]);
  await send('allocations',{...allocation,plan:otherPlan.id,package:otherPackage.id},randomUUID(),[409]);
  await send('inspections',{...qc,package:root.id,allocationRevision:3},randomUUID(),[409]);
  await h.db.query('UPDATE planning_projects SET revision=revision-1 WHERE id=$1',[f.project.id]);
  const complete=await h.fixture(true);
  const ruleBefore=await unchanged();
  const schoolPlans=[];
  for(const site of complete.project.sites) schoolPlans.push(await send('plans',{project:complete.project.id,site:site.id,approval:complete.approval.id,demandRevision:1}));
  const counts=schoolPlans.map(p=>({common:p.snapshot.packages.filter(x=>x.kind==='common_crate').length,universal:p.snapshot.packages.filter(x=>x.kind==='universal_crate').length}));
  expect(counts).toEqual([{common:6,universal:2},{common:3,universal:0}]);
  expect(schoolPlans[0].snapshot.packages.filter(p=>p.subject==='Mathematics'&&p.kind==='kit')).toHaveLength(5);
  for(const p of schoolPlans) {
    expect(p.snapshot.packages.filter(x=>x.subject==='Mathematics'&&x.kind.endsWith('_crate'))).toHaveLength(0);
    const physical=p.snapshot.packages.flatMap(x=>x.materials).reduce((n,m)=>n+Math.round(Number(m.quantity)*10000),0);
    const demand=p.snapshot.lines.filter(l=>l.material_id&&l.inventory_item_id).reduce((n,l)=>n+Math.round(l.quantity*10000),0);
    expect(physical).toBe(demand);
  }
  expect(await unchanged()).toBe(ruleBefore);
  h.evidence.packing_rules={http:'PASS',schoolA:counts[0],schoolB:counts[1],math_kits:5,shared_references:'one physical material assignment; no stock or commitment writes'};
  h.evidence.packing_custody={http:'PASS',plan:plan.id,accepted:accepted.id,rejected:rejected.id,partial:'0.0500 + 0.0500',concurrency:'one winner',retry:'immutable receipts',rollback_stages:3,stock_and_commitments:'unchanged',qc:'six evidence checks; stale and double acceptance denied',dispatch:'blocked'};
}
