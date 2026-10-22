import { CommitmentLedgerService } from '../../services/CommitmentLedgerService';
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { AuthService } from '../../services/AuthService';
import { env } from '../../config/env';
import { acknowledgeDelivery } from '../../services/TrustedDeliveryService';
import { expect } from 'vitest';
import { InventoryItem } from '../../entity/InventoryItem';
import { StocktakeService } from '../../services/StocktakeService';
import type { TrustedLedgerAuthority, LedgerRequest } from '../../security/TrustedLedgerAuthority';
import type { verifyWorkOrderAuthority } from './workOrderAuthority.cases';
import type { PackingSnapshot } from '../../features/packing/packingPlan';
import { qcChecks } from '../../features/packing/packingTypes';
import type { WorkOrderResult } from '../../services/WorkOrderAuthorityService';

export async function verifyDeliveryAuthority(h:Parameters<typeof verifyWorkOrderAuthority>[0],authority:TrustedLedgerAuthority,token:string,base:string) {
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
  const requests:{path:string;input:unknown;key:string;result:unknown}[]=[];
  const send=async(path:string,body:unknown,key:string=randomUUID(),statuses=[201])=>{
    const res=await fetch(`${base}/operator/delivery/${path}`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify(body)});
    const data=await res.json();
    const actions={dispatches:'dispatchPacking',acknowledgments:'acknowledgeDelivery',installations:'createTrustedInstallation','installation-actions':'trustedInstallationAction',closure:'closeTrustedProject'};
    if(res.status===409&&!statuses.includes(409)) await authority.performProductionForSession(token,{action:actions[path as keyof typeof actions],key,input:body} as never);
    expect(statuses,JSON.stringify(data)).toContain(res.status);if(res.status===201)requests.push({path,input:body,key,result:data});return data;
  };
  const plan=await authority.performProductionForSession(token,{action:'createPackingPlan',key:randomUUID(),input:{project:f.project.id,site:f.site,approval:f.approval.id,demandRevision:1}}) as {id:string;snapshot:PackingSnapshot};
  const roots=plan.snapshot.packages.filter(p=>p.kind==='kit').map(p=>p.id);
  const inputDispatch={plan:plan.id,roots,transport:{carrier:'Synthetic carrier',vehicle:'TEST',planned_date:new Date().toISOString(),notes:'Synthetic acceptance only'}};
  await send('dispatches',inputDispatch,randomUUID(),[409]);
  for(const p of plan.snapshot.packages.filter(p=>p.materials.length)) for(const line of p.materials)
    await authority.performProductionForSession(token,{action:'allocatePackingOutput',key:randomUUID(),input:{plan:plan.id,package:p.id,output:finished.id as string,line:line.line_id,quantity:line.quantity}});
  const checks=Object.fromEntries(qcChecks.map(name=>[name,{pass:true,evidence:`Synthetic verified ${name}`}])) as Record<typeof qcChecks[number],{pass:boolean;evidence:string}>;
  for(const root of roots) await authority.performProductionForSession(token,{action:'inspectPacking',key:randomUUID(),input:{plan:plan.id,package:root,allocationRevision:2,decision:'accept',checks,notes:'Synthetic whole assembly QC'}});
  const physical=async()=>JSON.stringify(await h.db.query('SELECT * FROM stock_ledger ORDER BY id'));
  const physicalBefore=await physical();
  const custody=async()=>Object.fromEntries(await Promise.all(['stock_ledger','commitment_events','commitment_balances','commitment_claims','trusted_dispatches','trusted_dispatch_units','trusted_delivery_receipts','audit_logs','commitment_authorizations'].map(async table=>[table,(await h.db.query(`SELECT count(*)::int n,md5(coalesce(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) hash FROM ${table} t`))[0]])));
  const denied=await custody();
  await h.identity.query('UPDATE users SET password_hash=$1 WHERE id=$2',[await bcrypt.hash(h.password,10),h.other.id]);
  const outsider=await new AuthService(h.identity).login(h.other.email,h.password);
  const foreign=await fetch(`${base}/operator/delivery/dispatches`,{method:'POST',headers:{Authorization:`Bearer ${outsider.token}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(inputDispatch)});
  expect([403,409]).toContain(foreign.status);
  await send('dispatches',{...inputDispatch,actor_id:h.other.id},randomUUID(),[409]);
  await send('dispatches',{...inputDispatch,roots:[...roots,plan.snapshot.packages.find(p=>p.parent_id)?.id]},randomUUID(),[409]);
  await send('dispatches',{...inputDispatch,plan:randomUUID()},randomUUID(),[409]);
  const revoked=await new AuthService(h.identity).login(h.admin.email,h.password);
  await new AuthService(h.identity).revokeRefreshToken(revoked.refreshToken!);
  const forged=jwt.sign({...jwt.decode(token) as object,sub:h.other.id},env.jwtSecret);
  for(const access of [revoked.token!,forged]) {
    const response=await fetch(`${base}/operator/delivery/dispatches`,{method:'POST',headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body:JSON.stringify(inputDispatch)});
    expect([401,403,409]).toContain(response.status);
  }
  expect(await custody()).toEqual(denied);
  async function rollback(path:string,body:unknown,tables:string[]) {
    for(const table of tables) {
      const before=await custody();
      await h.db.query(`CREATE FUNCTION d4_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Injected D4 failure'; END $$; REVOKE ALL ON FUNCTION d4_test_failure() FROM PUBLIC; CREATE TRIGGER z_d4_test_failure AFTER INSERT ON ${table} FOR EACH ROW EXECUTE FUNCTION d4_test_failure()`);
      try {await send(path,body,randomUUID(),[409]);} finally {await h.db.query(`DROP TRIGGER z_d4_test_failure ON ${table}; DROP FUNCTION d4_test_failure()`);}
      expect(await custody()).toEqual(before);
    }
  }
  await rollback('dispatches',inputDispatch,['trusted_dispatch_units','audit_logs','commitment_authorizations']);
  const key=randomUUID(),rivalKey=randomUUID(),race=await Promise.all([send('dispatches',inputDispatch,key,[201,409]),send('dispatches',inputDispatch,rivalKey,[201,409])]);
  expect(race.filter(r=>r.id)).toHaveLength(1);
  const dispatch=race.find(r=>r.id)!;
  const winningKey=requests.find(r=>r.path==='dispatches'&&(r.result as {id:string}).id===dispatch.id)!.key;
  expect(await send('dispatches',inputDispatch,winningKey)).toEqual(dispatch);
  await send('dispatches',{...inputDispatch,roots:[roots[0]]},winningKey,[409]);
  await send('dispatches',inputDispatch,randomUUID(),[409]);
  const balances=async()=>h.db.query(`SELECT b.approved::text,b.fulfilled::text,b.held::text FROM commitment_balances b JOIN commitment_accounts a ON a.id=b.account_id WHERE a.project_id=$1 AND a.dimension='slot' ORDER BY a.id`,[f.project.id]);
  expect((await balances()).every((b:{fulfilled:string;held:string})=>Number(b.fulfilled)===0&&Number(b.held)===2)).toBe(true);
  const receipt={dispatch:dispatch.id,roots:[roots[0]],recipient:'Synthetic receiving witness',acknowledged_at:new Date().toISOString(),acknowledgement:'Synthetic evidence: physical unit received intact',source:randomUUID()};
  await rollback('acknowledgments',receipt,['commitment_events','audit_logs','commitment_authorizations']);
  await expect(h.writer.transaction(m=>acknowledgeDelivery(m,{organization:h.admin.organization_id,actor:h.admin.id},receipt,randomUUID()))).rejects.toMatchObject({code:'23514'});
  const wrongScope={action:'dispatchPacking',key:randomUUID(),input:inputDispatch} as const;
  await expect(authority.performForSession(token,await authority.issue(token,wrongScope),{action:'acknowledgeDelivery',key:wrongScope.key,input:receipt})).rejects.toThrow();
  const unit=(await h.db.query('SELECT * FROM trusted_dispatch_units WHERE dispatch_id=$1 AND claim_id IS NOT NULL LIMIT 1',[dispatch.id]))[0];
  await expect(h.writer.transaction(m=>new CommitmentLedgerService(m).executeInTransaction(m,{organization:h.admin.organization_id,actor:h.admin.id},unit.account_id,unit.entitlement_id,randomUUID(),'Attempt without receipt',{kind:'consume',payload:{claim:unit.claim_id,quantity:'1'}}))).rejects.toMatchObject({code:'23514'});
  await send('acknowledgments',{...receipt,roots:[randomUUID()]},randomUUID(),[409]);
  await send('acknowledgments',{...receipt,roots:[roots[0],roots[0]]},randomUUID(),[409]);
  await send('acknowledgments',{...receipt,acknowledged_at:'2000-01-01T00:00:00Z'},randomUUID(),[409]);
  const keys=[randomUUID(),randomUUID()],receiptRace=await Promise.all(keys.map(key=>send('acknowledgments',receipt,key,[201,409])));
  expect(receiptRace.filter(r=>r.id)).toHaveLength(1);
  const ack=receiptRace.find(r=>r.id)!,receiptKey=keys[receiptRace.findIndex(r=>r.id)];
  expect(await send('acknowledgments',receipt,receiptKey)).toEqual(ack);
  await send('acknowledgments',{...receipt,recipient:'Changed witness'},receiptKey,[409]);
  await send('acknowledgments',{...receipt,source:randomUUID()},randomUUID(),[409]);
  expect((await balances()).every((b:{fulfilled:string;held:string})=>Number(b.fulfilled)===1&&Number(b.held)===1)).toBe(true);
  const createJob={project_id:f.project.id,site_id:f.site,required:true,checklist:[{id:'setup',label:'Synthetic setup checked',required:true}],survey:'Synthetic site survey'};
  let job=await send('installations',createJob);
  const act=async(action:string,extra:object={},status=[201])=>send('installation-actions',{id:job.id,input:{revision:job.revision,action,notes:'Synthetic installation evidence',...extra}},randomUUID(),status);
  await act('finish',{},[409]);
  await send('acknowledgments',{...receipt,roots:[roots[1]],source:randomUUID(),acknowledged_at:new Date().toISOString()});
  expect((await balances()).every((b:{fulfilled:string;held:string})=>Number(b.fulfilled)===2&&Number(b.held)===0)).toBe(true);
  expect(await physical()).toBe(physicalBefore);
  const close={project:f.project.id,input:{revision:0,project_revision:1,action:'close',recipient:'Synthetic project recipient',notes:'Synthetic project acceptance'}};
  await send('closure',close,randomUUID(),[409]);
  job=await act('check',{task_id:'setup',checked:true});
  await act('note',{revision:job.revision-1},[409]);
  await act('accept',{recipient:'Synthetic school recipient'},[409]);
  job=await act('issue');
  await act('finish',{},[409]);
  job=await act('correct',{issue_id:job.issues[0].id});
  job=await act('finish');expect(job.status).toBe('installed');expect(job.acceptance).toBeNull();
  await send('closure',close,randomUUID(),[409]);
  job=await act('accept',{recipient:'Synthetic school recipient'});expect(job.status).toBe('completed');
  for(const site of f.project.sites.filter(s=>s.id!==f.site)) {
    const next=await perform({action:'claimWorkOrder',key:randomUUID(),input:{project:f.project.id,site:site.id,approval:f.approval.id,demandRevision:1,recipe:(recipe as {id:string}).id,quantity:'0.2',unit:'m',source:randomUUID()}}) as WorkOrderResult;
    let supply=await stocktake.create(h.admin.organization_id,h.admin.id,'Second school input','',[{item_id:input.id,locations:['Packing input'],complete_coverage:true}]);
    supply=await stocktake.count(h.admin.organization_id,supply.id,h.admin.id,supply.revision,input.id,'Packing input','1','g');
    for(const action of ['review','approve','post'] as const)supply=await stocktake.transition(h.admin.organization_id,supply.id,h.admin.id,supply.revision,action,'Synthetic school B evidence');
    await perform({action:'issueWorkOrder',key:randomUUID(),input:{order:next.id,material:next.materials[0].id,source:randomUUID(),quantity:'1',unit:'g',location:'Packing input',reason:'Synthetic school B evidence'}});
    const produced=await authority.performProductionForSession(token,{action:'recordFinishedOutput',key:randomUUID(),input:{order:next.id,source:randomUUID(),quantity:'0.2',unit:'m',location:'School B shelf'}});
    const second=await authority.performProductionForSession(token,{action:'createPackingPlan',key:randomUUID(),input:{project:f.project.id,site:site.id,approval:f.approval.id,demandRevision:1}}) as {id:string;snapshot:PackingSnapshot};
    let revision=0;
    for(const pack of second.snapshot.packages)for(const line of pack.materials){await authority.performProductionForSession(token,{action:'allocatePackingOutput',key:randomUUID(),input:{plan:second.id,package:pack.id,output:produced.id as string,line:line.line_id,quantity:line.quantity}});revision++;}
    const secondRoots=second.snapshot.packages.filter(p=>p.kind==='kit').map(p=>p.id);
    for(const root of secondRoots)await authority.performProductionForSession(token,{action:'inspectPacking',key:randomUUID(),input:{plan:second.id,package:root,allocationRevision:revision,decision:'accept',checks,notes:'School B complete inspection'}});
    const crossSchool=await custody();
    await send('dispatches',{...inputDispatch,plan:second.id,roots},randomUUID(),[409]);
    expect(await custody()).toEqual(crossSchool);
    const shipment=await send('dispatches',{...inputDispatch,plan:second.id,roots:secondRoots});
    const wrongReceipt=await custody();
    await send('acknowledgments',{...receipt,dispatch:shipment.id,source:randomUUID()},randomUUID(),[409]);
    expect(await custody()).toEqual(wrongReceipt);
    await send('acknowledgments',{...receipt,dispatch:shipment.id,roots:secondRoots,source:randomUUID(),acknowledged_at:new Date().toISOString()});
    await send('installations',{...createJob,site_id:site.id,required:false,checklist:[],survey:'Synthetic school B requires no installation'});
  }
  const progress=await fetch(`${base}/trusted-delivery/projects/${f.project.id}/progress`,{headers:{Authorization:`Bearer ${token}`}});
  expect(progress.status).toBe(200);expect((await progress.json()).blockers,JSON.stringify(await h.db.query(`SELECT a.dimension,b.held,b.fulfilled FROM commitment_accounts a JOIN commitment_balances b ON b.account_id=a.id WHERE a.project_id=$1 AND b.held<>0`,[f.project.id]))).toEqual([]);
  const closeKey=randomUUID(),closed=await send('closure',close,closeKey);expect(closed.status).toBe('closed');
  expect(await send('closure',close,closeKey)).toEqual(closed);
  await act('reopen',{},[409]);
  await expect(h.writer.query('UPDATE site_installations SET revision=revision+1 WHERE id=$1',[job.id])).rejects.toMatchObject({code:'23514'});
  for(const table of ['trusted_dispatches','trusted_dispatch_units','trusted_delivery_receipts']) {
    await expect(h.runtime.query(`INSERT INTO ${table} DEFAULT VALUES`)).rejects.toMatchObject({code:'42501'});
    await expect(h.identity.query(`SELECT * FROM ${table}`)).rejects.toMatchObject({code:'42501'});
    await expect(h.writer.query(`UPDATE ${table} SET id=id`)).rejects.toMatchObject({code:'42501'});
    await expect(h.db.query(`DELETE FROM ${table}`)).rejects.toMatchObject({code:'23514'});
  }
  h.evidence.delivery={dispatch:dispatch.id,receipts:2,partial:'H2/F0 -> H1/F1 -> H0/F2',physical:'unchanged',retry:'durable',duplicate:'denied',direct_consume:'denied',installation:job.id,closure:closed.id,requests};
  const complete=await h.fixture('custody'),schoolCounts=[];
  for(const site of complete.project.sites) {
    const packed=await authority.performProductionForSession(token,{action:'createPackingPlan',key:randomUUID(),input:{project:complete.project.id,site:site.id,approval:complete.approval.id,demandRevision:1}}) as {id:string;snapshot:PackingSnapshot};
    const outputs=new Map<string,string>();
    for(const line of packed.snapshot.lines.filter(l=>l.material_id&&l.inventory_item_id&&l.quantity>0)) {
      const quantity=Number(line.quantity).toFixed(4),raw=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:'Synthetic multi-school raw input',unit:'g',sku:randomUUID(),base_price:0,quantity:0,threshold:0});
      const specification=await perform({action:'publishRecipe',key:randomUUID(),input:{name:'Synthetic multi-school recipe',definition:{output_item_id:line.inventory_item_id!,unit:line.unit,yield_quantity:quantity,instructions:'',specification:'',concentration:'',inputs:[{item_id:raw.id,quantity:'1',canonical_quantity:'1',unit:'g',scrap_percent:'0'}]}}});
      const work=await perform({action:'claimWorkOrder',key:randomUUID(),input:{project:complete.project.id,site:site.id,approval:complete.approval.id,demandRevision:1,recipe:(specification as {id:string}).id,quantity,unit:line.unit,source:randomUUID()}}) as WorkOrderResult;
      let counted=await stocktake.create(h.admin.organization_id,h.admin.id,'Synthetic multi-school count','',[{item_id:raw.id,locations:['Multi-school input'],complete_coverage:true}]);
      counted=await stocktake.count(h.admin.organization_id,counted.id,h.admin.id,counted.revision,raw.id,'Multi-school input','1','g');
      for(const action of ['review','approve','post'] as const)counted=await stocktake.transition(h.admin.organization_id,counted.id,h.admin.id,counted.revision,action,'Synthetic multi-school physical evidence');
      await perform({action:'issueWorkOrder',key:randomUUID(),input:{order:work.id,material:work.materials[0].id,source:randomUUID(),quantity:'1',unit:'g',location:'Multi-school input',reason:'Synthetic multi-school physical evidence'}});
      const produced=await authority.performProductionForSession(token,{action:'recordFinishedOutput',key:randomUUID(),input:{order:work.id,source:randomUUID(),quantity,unit:line.unit,location:'Multi-school output'}});
      outputs.set(line.material_id!,produced.id as string);
    }
    let revision=0;
    for(const pack of packed.snapshot.packages)for(const line of pack.materials){await authority.performProductionForSession(token,{action:'allocatePackingOutput',key:randomUUID(),input:{plan:packed.id,package:pack.id,output:outputs.get(line.line_id)!,line:line.line_id,quantity:line.quantity}});revision++;}
    const kitRoots=packed.snapshot.packages.filter(p=>p.kind==='kit').map(p=>p.id);
    for(const root of kitRoots)await authority.performProductionForSession(token,{action:'inspectPacking',key:randomUUID(),input:{plan:packed.id,package:root,allocationRevision:revision,decision:'accept',checks,notes:'Synthetic multi-school accepted physical assembly'}});
    const beforeShipment=await physical(),shipment=await send('dispatches',{...inputDispatch,plan:packed.id,roots:kitRoots});
    await send('acknowledgments',{...receipt,dispatch:shipment.id,roots:kitRoots,source:randomUUID(),acknowledged_at:new Date().toISOString()});
    expect(await physical()).toBe(beforeShipment);
    const slots=await h.db.query(`SELECT a.selector,b.fulfilled::text,b.held::text FROM commitment_accounts a JOIN commitment_balances b ON b.account_id=a.id WHERE a.project_id=$1 AND a.site_id=$2 AND a.dimension='slot'`,[complete.project.id,site.id]);
    expect(slots.every((s:{held:string})=>Number(s.held)===0)).toBe(true);
    const counts={common:packed.snapshot.packages.filter(p=>p.kind==='common_crate').length,universal:packed.snapshot.packages.filter(p=>p.kind==='universal_crate').length,fulfilled:slots.reduce((n:number,s:{fulfilled:string})=>n+Number(s.fulfilled),0)};
    schoolCounts.push(counts);
    expect(packed.snapshot.packages.filter(p=>p.subject==='Mathematics'&&p.kind.endsWith('_crate'))).toHaveLength(0);
  }
  expect(schoolCounts).toEqual([{common:6,universal:2,fulfilled:19},{common:3,universal:0,fulfilled:6}]);
  const recoveryJob=await send('installations',{project_id:complete.project.id,site_id:complete.site,required:false,checklist:[],survey:'Synthetic recovery school installation decision'});
  (h.evidence.delivery as {recovery_installation?:string}).recovery_installation=recoveryJob.id;
  h.evidence.delivery_multi_school={schoolCounts,actual_production_dispatch_receipt:true,physical_stock_unchanged_by_delivery:true};
}
