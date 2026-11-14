import { randomUUID } from 'node:crypto';
import { expect } from 'vitest';
import { InventoryItem } from '../../entity/InventoryItem';
import { StocktakeService } from '../../services/StocktakeService';
import type { TrustedLedgerAuthority } from '../../security/TrustedLedgerAuthority';
import type { LedgerRequest } from '../../security/TrustedLedgerAuthority';
import type { WorkOrderResult } from '../../services/WorkOrderAuthorityService';
import type { PackingSnapshot } from '../../features/packing/packingPlan';
import { qcChecks } from '../../features/packing/packingTypes';
import type { verifyWorkOrderAuthority } from './workOrderAuthority.cases';

/** Exact school mix; all records and acceptance witnesses are synthetic. */
export async function verifyD6Journey(h:Parameters<typeof verifyWorkOrderAuthority>[0], authority:TrustedLedgerAuthority, token:string) {
  const f=await h.fixture('d6');
  const [{item_key:output}]=await h.db.query('SELECT item_key FROM commitment_accounts WHERE id=$1',[f.account]);
  const input=await h.db.getRepository(InventoryItem).save({organization_id:h.admin.organization_id,name:'SYNTHETIC D6 shared input',unit:'g',sku:randomUUID(),base_price:0,quantity:0,threshold:0});
  const capabilities=new Map<string,string>();
  const perform=async<T=Record<string,unknown>>(request:LedgerRequest)=>{
    const capability=capabilities.get(request.key)??await authority.issue(token,request);
    capabilities.set(request.key,capability);
    return authority.performForSession(token,capability,request) as Promise<T>;
  };
  const recipe=await perform({action:'publishRecipe',key:randomUUID(),input:{name:'SYNTHETIC D6 recipe',definition:{output_item_id:output,unit:'m',yield_quantity:'1',instructions:'Synthetic',specification:'Synthetic',concentration:'',inputs:[{item_id:input.id,quantity:'1',canonical_quantity:'1',unit:'g',scrap_percent:'0'}]}}});
  const counts=new StocktakeService(h.db);
  let count=await counts.create(h.admin.organization_id,h.admin.id,'SYNTHETIC D6 input opening','Synthetic only',[{item_id:input.id,locations:['D6 shared input'],complete_coverage:true}]);
  count=await counts.count(h.admin.organization_id,count.id,h.admin.id,count.revision,input.id,'D6 shared input','3.7','g');
  for(const action of ['review','approve','post'] as const)count=await counts.transition(h.admin.organization_id,count.id,h.admin.id,count.revision,action,'SYNTHETIC TEST EVIDENCE');
  const schools=[];
  for(const [index,site] of f.project.sites.entries()) {
    const quantity=index===0?'2.8':'0.9';
    const claim={action:'claimWorkOrder',key:randomUUID(),input:{project:f.project.id,site:site.id,approval:f.approval.id,demandRevision:1,recipe:recipe.id as string,quantity,unit:'m',source:randomUUID()}} as const;
    const order=await perform<WorkOrderResult>(claim);
    expect(await perform(claim)).toEqual(order);
    await expect(perform({...claim,key:randomUUID(),input:{...claim.input,source:randomUUID()}})).rejects.toThrow();
    await perform({action:'issueWorkOrder',key:randomUUID(),input:{order:order.id,material:order.materials[0].id,source:randomUUID(),quantity,unit:'g',location:'D6 shared input',reason:'SYNTHETIC D6 issue'}});
    const produced=await perform({action:'recordFinishedOutput',key:randomUUID(),input:{order:order.id,source:randomUUID(),quantity,unit:'m',location:`D6 school ${index} shelf`}});
    const plan=await perform<{id:string;snapshot:PackingSnapshot}>({action:'createPackingPlan',key:randomUUID(),input:{project:f.project.id,site:site.id,approval:f.approval.id,demandRevision:1}});
    const common=plan.snapshot.packages.filter(p=>p.kind==='common_crate').length;
    const universal=plan.snapshot.packages.filter(p=>p.kind==='universal_crate').length;
    expect({common,universal}).toEqual(index===0?{common:6,universal:2}:{common:3,universal:0});
    let revision=0;
    for(const pack of plan.snapshot.packages)for(const line of pack.materials){await perform({action:'allocatePackingOutput',key:randomUUID(),input:{plan:plan.id,package:pack.id,output:produced.id as string,line:line.line_id,quantity:line.quantity}});revision++;}
    const roots=plan.snapshot.packages.filter(p=>p.kind==='kit').map(p=>p.id);
    const transport={carrier:'SYNTHETIC carrier',vehicle:'TEST',planned_date:new Date().toISOString(),notes:'SYNTHETIC TEST EVIDENCE'};
    await expect(perform({action:'dispatchPacking',key:randomUUID(),input:{plan:plan.id,roots,transport}})).rejects.toThrow();
    const checks=Object.fromEntries(qcChecks.map(name=>[name,{pass:true,evidence:'SYNTHETIC TEST EVIDENCE'}])) as Record<typeof qcChecks[number],{pass:boolean;evidence:string}>;
    expect(qcChecks).toHaveLength(6);
    for(const root of roots)await perform({action:'inspectPacking',key:randomUUID(),input:{plan:plan.id,package:root,allocationRevision:revision,decision:'accept',checks,notes:'Synthetic six-check inspection'}});
    const shipment=await perform({action:'dispatchPacking',key:randomUUID(),input:{plan:plan.id,roots,transport}});
    const physical=await h.db.query('SELECT sum(qty_delta)::text quantity FROM stock_ledger WHERE item_id=$1',[input.id]);
    const receipt:Extract<LedgerRequest,{action:'acknowledgeDelivery'}>={action:'acknowledgeDelivery',key:randomUUID(),input:{dispatch:shipment.id as string,roots:[roots[0]],recipient:'Synthetic school recipient',acknowledged_at:new Date().toISOString(),acknowledgement:'SYNTHETIC TEST EVIDENCE',source:randomUUID()}};
    const acknowledged=await perform(receipt);
    expect(await perform(receipt)).toEqual(acknowledged);
    await expect(perform({...receipt,key:randomUUID(),input:{...receipt.input,source:randomUUID()}})).rejects.toThrow();
    if(roots.length>1)await perform({...receipt,key:randomUUID(),input:{...receipt.input,roots:roots.slice(1),source:randomUUID()}});
    expect(await h.db.query('SELECT sum(qty_delta)::text quantity FROM stock_ledger WHERE item_id=$1',[input.id])).toEqual(physical);
    let job=await perform({action:'createTrustedInstallation',key:randomUUID(),input:{project_id:f.project.id,site_id:site.id,required:true,checklist:[{id:'setup',label:'Synthetic setup',required:true}],survey:'Synthetic site survey'}});
    for(const action of ['check','finish','accept'] as const)job=await perform({action:'trustedInstallationAction',key:randomUUID(),input:{id:job.id as string,input:{revision:job.revision as number,action,notes:'SYNTHETIC TEST EVIDENCE',...(action==='check'?{task_id:'setup',checked:true}:{}),...(action==='accept'?{recipient:'Synthetic recipient'}:{})}}});
    expect(job.status).toBe('completed');
    schools.push({site:site.id,common,universal,quantity,roots:roots.length,plan:plan.id,dispatch:shipment.id});
  }
  const close={action:'closeTrustedProject',key:randomUUID(),input:{project:f.project.id,input:{revision:0,project_revision:1,action:'close',recipient:'Synthetic NGO recipient',notes:'SYNTHETIC TEST EVIDENCE'}}} as const;
  await expect(perform(close)).rejects.toThrow(/Completion blocked/);
  await expect(perform(close)).rejects.toThrow(/Completion blocked/);
  expect(await h.db.query('SELECT id FROM project_completions WHERE project_id=$1',[f.project.id])).toEqual([]);
  const [{quantity}]=await h.db.query('SELECT sum(qty_delta)::text quantity FROM stock_ledger WHERE item_id=$1',[input.id]);expect(Number(quantity)).toBe(0);
  const balances=await h.db.query('SELECT a.dimension,b.* FROM commitment_balances b JOIN commitment_accounts a ON a.id=b.account_id WHERE a.project_id=$1',[f.project.id]);
  // Preserve the existing authority boundary: output ownership has no approved fulfillment transition.
  for(const balance of balances)expect({account:balance.account_id,held:Number(balance.held),fulfilled:Number(balance.fulfilled)}).toEqual({account:balance.account_id,held:balance.dimension==='material'?Number(balance.approved):0,fulfilled:balance.dimension==='material'?0:Number(balance.approved)});
  h.evidence.d6_exact_journey={classification:'SYNTHETIC TEST EVIDENCE',project:f.project.id,schools,independent_math:1,input_opening:'3.7 g',input_remaining:'0 g',output:'3.7 m',closure:'BLOCKED: retained material ownership',physical_delivery_mutation:false,balances,software:'BLOCKED',reconciliation_blocker:'Output material ownership remains held; explicit authorized fulfillment contract required',procurement:'Separately exercised by purchasing acceptance cases; not linked to this journey',pilot:'NO-GO'};
}
