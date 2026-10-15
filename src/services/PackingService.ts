import {DataSource,EntityManager,In,IsNull} from "typeorm";
import {createHash,randomUUID} from "node:crypto";
import {InventoryItem} from "../entity/InventoryItem";
import {User} from "../entity/User";
import {PlanningProject,PlanningSchoolSite} from "../entity/PlanningProject";
import {ProductTemplateVersion} from "../entity/ProductTemplateVersion";
import {SupplyOperation,SupplyEvent,ProjectStockReservation} from "../entity/SupplyPlanning";
import {DraftKitError} from "./ProductTemplateService";
import {ProjectPlanningService} from "./ProjectPlanningService";
import {verifiedAvailability,locationBalance} from "./PhysicalStockService";
import {reservationTotals} from "./SupplyStockService";
import {stockText,stockUnits} from "../features/inventory/physicalQuantity";
import {decimalUnits} from "../features/projects/requirementPlanning";
import {materializePacking,type PackingSnapshot,type PhysicalPackage,type PackMaterial} from "../features/packing/packingPlan";
import {actualMaterials,qcChecks,type PackingOrder,type PackingPick,type PackingDetail,type PackingMaterialSummary,type PackageProgress} from "../features/packing/packingTypes";
import type {MaterialSummary} from "../features/projects/planningTypes";
const fail=(status:number,message:string):never=>{throw new DraftKitError(status,message);};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const emptyProgress=():PackageProgress=>({assembled:false,qc:"pending"});
export class PackingService {
  constructor(private readonly db:DataSource){}
  private async operation<T>(org:string,actor:string,key:string,input:unknown,run:(m:EntityManager)=>Promise<T>):Promise<T>{
    if(!key||key.length>100)fail(400,"Idempotency key required");const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.db.transaction(async m=>{await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[org+":"+key]);const old=await m.findOneBy(SupplyOperation,{organization_id:org,key});
      if(old){if(old.actor_id!==actor||old.fingerprint!==fingerprint)fail(409,"Idempotency key already used");return old.result as T;}
      const result=await run(m);await m.insert(SupplyOperation,{organization_id:org,actor_id:actor,key,fingerprint,result:JSON.parse(JSON.stringify(result)) as unknown});return result;});
  }
  private async audit(m:EntityManager,org:string,actor:string,o:PackingOrder){await m.insert(SupplyEvent,{organization_id:org,actor_id:actor,kind:"packing",record_id:o.id,revision:o.revision,snapshot:o});}
  private async order(m:EntityManager,org:string,id:string,revision?:number):Promise<PackingOrder>{const rows:PackingOrder[]=await m.query(`SELECT * FROM packing_orders WHERE id=$1 AND organization_id=$2 ${revision===undefined?"":"FOR UPDATE"}`,[id,org]);if(!rows[0])fail(404,"Packing order not found");if(revision!==undefined&&rows[0].revision!==revision)fail(409,"Packing changed; reopen before retrying");return rows[0];}
  private async save(m:EntityManager,org:string,actor:string,o:PackingOrder){const [rows]:[PackingOrder[],number]=await m.query(`UPDATE packing_orders SET execution=$3,status=$4,revision=revision+1,assigned_employee_id=$5,assigned_team=$6,approved_by=$7,updated_by=$8,updated_at=now() WHERE id=$1 AND organization_id=$2 RETURNING *`,[o.id,org,JSON.stringify(o.execution),o.status,o.assigned_employee_id,o.assigned_team,o.approved_by,actor]);await this.audit(m,org,actor,rows[0]);return rows[0];}
  private quantity(q:string){try{const n=stockUnits(q);if(!n)fail(400,"Positive quantity required");return n;}catch(e){if(e instanceof DraftKitError)throw e;return fail(400,(e as Error).message);}}
  private async item(m:EntityManager,org:string,id:string,lock=false){if(!uuid.test(id))fail(400,"Invalid material identity");const i=await m.findOne(InventoryItem,{where:{id,organization_id:org},...(lock?{lock:{mode:"pessimistic_write" as const}}:{})});if(!i)fail(404,"Inventory item not found");return i;}
  private async approval(m:EntityManager,org:string,actor:string){const u=await m.findOneBy(User,{id:actor,organization_id:org,is_active:true});if(!u||!["admin","super_admin","manager"].includes(u.role))fail(403,"Authorized approval required");}
  async list(org:string){return this.db.query(`SELECT id,number,status,revision,batch_code,project_id,site_id,snapshot->>'project_name' project_name,snapshot->>'site_name' site_name,assigned_team,updated_at FROM packing_orders WHERE organization_id=$1 ORDER BY updated_at DESC LIMIT 200`,[org]);}
  async create(org:string,actor:string,key:string,input:{project_id?:string;site_id?:string;demand_revision?:number;batch_code:string;manual?:{name:string;materials:{item_id:string;quantity:string;unit:string}[]}}){
    return this.operation(org,actor,key,["packing.create",input],async m=>{
      let snapshot:PackingSnapshot;
      if(input.project_id){
        if(input.manual||!input.site_id||!input.demand_revision)fail(400,"Select project, school and requirement revision together");
        const p=await m.findOne(PlanningProject,{where:{id:input.project_id,organization_id:org,archived_at:IsNull()},lock:{mode:"pessimistic_write"}});if(!p)fail(404,"Project not found");
        const site=await m.findOneBy(PlanningSchoolSite,{id:input.site_id,project_id:p.id,organization_id:org});if(!site)fail(404,"School/site not found");
        const preview=await new ProjectPlanningService(this.db).previewInTransaction(m,p.id,org,input.demand_revision);
        const ids=[...new Set(site.content.selections.map(s=>s.version_id))];const versions=ids.length?await m.findBy(ProductTemplateVersion,{id:In(ids),organization_id:org,status:"published"}):[];
        snapshot=materializePacking(p.content.name,site.content,versions,preview.lines.filter(l=>l.site_id===site.id));
      }else{
        if(input.site_id||input.demand_revision||!input.manual||Object.keys(input.manual).some(k=>!["name","materials"].includes(k))||typeof input.manual.name!=="string"||!input.manual.name.trim()||input.manual.name.length>200||!Array.isArray(input.manual.materials)||!input.manual.materials.length||input.manual.materials.length>100)fail(400,"Explicit manual packing definition required");
        const materials:PackMaterial[]=[];for(const v of input.manual.materials){if(!v||Object.keys(v).some(k=>!["item_id","quantity","unit"].includes(k)))fail(400,"Invalid manual material");const item=await this.item(m,org,v.item_id);this.quantity(v.quantity);if(item.unit!==v.unit)fail(400,"Manual materials require canonical inventory units");materials.push({line_id:randomUUID(),item_id:item.id,name:item.name,quantity:stockText(stockUnits(v.quantity)),unit:item.unit});}
        const id=randomUUID();const pack:PhysicalPackage={id,parent_id:null,kind:"kit",name:input.manual.name,code:`PK-${id}`,pack_number:1,selection_id:"manual",version_id:"manual",version_number:0,subject:"",grade:"",definition_id:"manual",activity_ids:[],inventory_item_ids:materials.map(v=>v.item_id),materials};snapshot={project_name:"General stock",site_name:"Manual assembly",packages:[pack],versions:[],lines:[]};
      }
      if(!snapshot.packages.length||!snapshot.packages.some(p=>p.materials.length))fail(400,"Select a nonempty physical kit allocation");
      for(const pack of snapshot.packages)for(const v of pack.materials){const item=await this.item(m,org,v.item_id,true);if(item.unit!==v.unit)fail(400,"Resolve requirement unit conversions before packing");}
      if(input.project_id&&(await m.query(`SELECT 1 FROM project_stock_reservations WHERE organization_id=$1 AND project_id=$2 AND site_id=$3 AND status='fulfilled' LIMIT 1`,[org,input.project_id,input.site_id])).length)fail(409,"Previously fulfilled school stock requires explicit reconciliation before packing");
      const rows:PackingOrder[]=await m.query(`INSERT INTO packing_orders(organization_id,project_id,site_id,demand_revision,number,batch_code,snapshot,execution,created_by,updated_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9) RETURNING *`,[org,input.project_id??null,input.site_id??null,input.demand_revision??null,`PACK-${randomUUID()}`,input.batch_code,JSON.stringify(snapshot),JSON.stringify({progress:{},exceptions:[],changes:[]}),actor]);await this.audit(m,org,actor,rows[0]);return rows[0];
    });
  }
  private picked(picks:PackingPick[],item:string,unit:string){return picks.filter(p=>p.item_id===item&&p.unit===unit).reduce((sum,p)=>sum+stockUnits(p.quantity),0n);}
  private requirements(o:PackingOrder){const totals=new Map<string,{item_id:string;name:string;unit:string;quantity:bigint}>();for(const p of o.snapshot.packages)for(const v of actualMaterials(o,p.id)){const key=JSON.stringify([v.item_id,v.unit]),old=totals.get(key)??{item_id:v.item_id,name:v.name,unit:v.unit,quantity:0n};old.quantity+=stockUnits(v.quantity);totals.set(key,old);}return [...totals.values()];}
  private picks(m:EntityManager,org:string,id:string):Promise<PackingPick[]>{return m.query(`SELECT * FROM packing_picks WHERE order_id=$1 AND organization_id=$2 ORDER BY created_at,id`,[id,org]);}
  async detail(org:string,id:string):Promise<PackingDetail>{return this.db.transaction("REPEATABLE READ",async m=>{
    const o=await this.order(m,org,id),picks=await this.picks(m,org,id),materials:PackingMaterialSummary[]=[];
    for(const v of this.requirements(o)){
      const stock:MaterialSummary={inventory_item_id:v.item_id,name:v.name,unit:v.unit,gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,incoming:null,immediate_shortage:null,projected_shortage:null};await verifiedAvailability(m,org,[stock]);
      const r=await reservationTotals(m,org,v.item_id,undefined,v.unit);const owned:{q:string}[]=await m.query(`SELECT COALESCE(SUM(quantity),0)::text q FROM project_stock_reservations WHERE organization_id=$1 AND item_id=$2 AND project_id=$3 AND site_id=$4 AND status='active'`,[org,v.item_id,o.project_id,o.site_id]);
      const available=stock.verified_on_hand===null?null:decimalUnits(stock.verified_on_hand)/100n-r.total+stockUnits(owned[0].q),picked=this.picked(picks,v.item_id,v.unit),remaining=v.quantity-picked;
      let assembled=0n,checked=0n;for(const p of o.snapshot.packages){const progress=o.execution.progress[p.id];const q=actualMaterials(o,p.id).filter(a=>a.item_id===v.item_id&&a.unit===v.unit).reduce((sum,a)=>sum+stockUnits(a.quantity),0n);if(progress?.assembled)assembled+=q;if(progress?.qc==="accepted")checked+=q;}
      materials.push({item_id:v.item_id,name:v.name,unit:v.unit,planned:stockText(v.quantity),picked:stockText(picked),assembled:stockText(assembled),checked:stockText(checked),completed:stockText(o.status==="ready"?checked:0n),remaining:stockText(remaining>0n?remaining:0n),stock_status:stock.stock_status,available:available===null?null:stockText(available>0n?available:0n),shortage:available===null?null:stockText(remaining>available?remaining-available:0n)});
    }
    const events=await m.find(SupplyEvent,{where:{organization_id:org,kind:"packing",record_id:id},order:{revision:"DESC"},take:100});const history=events.map(e=>({actor_id:e.actor_id,revision:e.revision,created_at:e.created_at.toISOString(),snapshot:e.snapshot}));return {order:o,picks,materials,history};
  });}
  async transition(org:string,actor:string,key:string,id:string,revision:number,verb:"release"|"pause"|"resume"|"cancel"|"reopen",reason:string){return this.operation(org,actor,key,["packing.transition",id,revision,verb,reason],async m=>{
    const o=await this.order(m,org,id,revision);
    if(verb==="release"){
      await this.approval(m,org,actor);if(o.status!=="draft")fail(409,"Only drafts can be released");
      if(o.project_id){const p=await m.findOne(PlanningProject,{where:{id:o.project_id,organization_id:org,archived_at:IsNull()},lock:{mode:"pessimistic_write"}});if(!p||p.revision!==o.demand_revision)fail(409,"Project requirements changed before approval");}
      o.approved_by=actor;o.status="packing";
    }else if(verb==="pause"){if(o.status!=="packing")fail(409,"Only active packing can be paused");o.status="paused";}
    else if(verb==="resume"){if(o.status!=="paused")fail(409,"Only paused packing can resume");o.status="packing";}
    else if(verb==="reopen"){await this.approval(m,org,actor);if(o.status!=="ready"||!reason.trim())fail(409,"Ready pack and rework reason required");o.status="packing";for(const p of Object.values(o.execution.progress))p.qc="pending";}
    else{if(!["draft","packing","paused"].includes(o.status)||(await this.picks(m,org,id)).length)fail(409,"Orders with picked stock require rework, not cancellation");o.status="cancelled";}
    if(reason)o.execution.exceptions.push({id:randomUUID(),package_id:o.snapshot.packages[0].id,kind:"other",notes:`${verb}: ${reason}`,reported_by:actor,reported_at:new Date().toISOString(),corrected_by:actor,corrected_at:new Date().toISOString(),correction:"Recorded state transition"});return this.save(m,org,actor,o);
  });}
  async assign(org:string,actor:string,key:string,id:string,revision:number,team:string,employee?:string){return this.operation(org,actor,key,["packing.assign",id,revision,team,employee],async m=>{const o=await this.order(m,org,id,revision);if(["ready","cancelled"].includes(o.status))fail(409,"Finalized packing assignment immutable");if(employee&&!await m.findOneBy(User,{id:employee,organization_id:org,is_active:true}))fail(404,"Employee not found");o.assigned_team=team;o.assigned_employee_id=employee??null;return this.save(m,org,actor,o);});}
  async pick(org:string,actor:string,key:string,id:string,revision:number,itemId:string,quantity:string,unit:string,location:string,reservationId?:string){return this.operation(org,actor,key,["packing.pick",id,revision,itemId,quantity,unit,location,reservationId],async m=>{
    const o=await this.order(m,org,id,revision);if(o.status!=="packing")fail(409,"Release and resume packing before picking");
    const item=await this.item(m,org,itemId,true),q=this.quantity(quantity);if(unit!==item.unit)fail(400,"Pick in canonical inventory units");const demand=this.requirements(o).find(v=>v.item_id===item.id&&v.unit===unit),picks=await this.picks(m,org,id);if(!demand||this.picked(picks,item.id,unit)+q>demand.quantity)fail(409,"Pick exceeds approved actual packing demand");
    const availability:MaterialSummary={inventory_item_id:item.id,name:item.name,unit,gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,incoming:null,immediate_shortage:null,projected_shortage:null};await verifiedAvailability(m,org,[availability]);if(availability.verified_on_hand===null)fail(409,"Unverified stock cannot be picked");
    let owned=0n;if(reservationId){const r=await m.findOne(ProjectStockReservation,{where:{id:reservationId,organization_id:org},lock:{mode:"pessimistic_write"}});if(!r||r.status!=="active"||r.item_id!==item.id||r.unit!==unit||r.project_id!==o.project_id||r.site_id!==o.site_id)fail(409,"Active matching school reservation required");owned=stockUnits(r.quantity);if(q>owned)fail(409,"Split picking into reserved and free quantities");const rest=owned-q;if(rest)r.quantity=stockText(rest);else r.status="released";r.revision++;r.updated_by=actor;r.reason=`Transferred ${stockText(q)} ${unit} to packing ${o.number}`;await m.save(r);await m.insert(SupplyEvent,{organization_id:org,actor_id:actor,kind:"reservation",record_id:r.id,revision:r.revision,snapshot:r});}
    const reserved=(await reservationTotals(m,org,item.id)).total;if(decimalUnits(availability.verified_on_hand)/100n-reserved<q)fail(409,"Insufficient free stock; use this school's reservation or pick partially");
    const b=await locationBalance(m,org,item.id,location);if(b.quantity===null||b.unit!==unit||stockUnits(b.quantity)<q)fail(409,"Insufficient verified stock at this location");
    // FIFO source movements are traceability references, not a second stock or lot balance.
    const movements:{id:string;qty_delta:string}[]=await m.query(`SELECT id,qty_delta::text FROM stock_ledger WHERE organization_id=$1 AND item_id=$2 AND physical_location=$3 AND verification_entry_id IS NOT NULL ORDER BY physical_sequence,id`,[org,item.id,location]);
    const queue:{id:string;quantity:bigint}[]=[];for(const row of movements){if(row.qty_delta.startsWith("-")){let consumed=stockUnits(row.qty_delta.slice(1));for(const source of queue){const take=source.quantity<consumed?source.quantity:consumed;source.quantity-=take;consumed-=take;if(!consumed)break;}if(consumed)fail(409,"Source movement reconciliation failed");}else{const n=stockUnits(row.qty_delta);if(n)queue.push({id:row.id,quantity:n});}}
    const sources:{id:string;quantity:string}[]=[];let remaining=q;for(const source of queue){const take=source.quantity<remaining?source.quantity:remaining;if(take)sources.push({id:source.id,quantity:stockText(take)});remaining-=take;if(!remaining)break;}if(remaining)fail(409,"Source movement balance mismatch");
    const pickId=randomUUID(),ledgerId=randomUUID();await m.query(`INSERT INTO packing_picks(id,organization_id,order_id,item_id,quantity,unit,location,ledger_id,reservation_id,source_movements,picked_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[pickId,org,id,item.id,stockText(q),unit,location,ledgerId,reservationId??null,JSON.stringify(sources),actor]);
    await m.query(`INSERT INTO stock_ledger(id,organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type,reference_type,reference_id,reason_code,actor_id,actor_name,verified_unit,verification_entry_id,physical_location,physical_sequence,packing_pick_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,0,'KIT_CONSUMPTION','packing_pick',$8::text,'PACKING_WIP',$9::uuid,$9::text,$10,$8::uuid,$11,$12,$8::uuid)`,[ledgerId,org,item.id,item.name,item.sku,stockText(-q),stockText(stockUnits(b.quantity)-q),pickId,actor,unit,location,b.sequence+1]);
    return this.save(m,org,actor,o);
  });}
  private pack(o:PackingOrder,id:string){const p=o.snapshot.packages.find(v=>v.id===id);if(!p)fail(404,"Package not found");return p;}
  private resetAncestors(o:PackingOrder,id:string){let parent=this.pack(o,id).parent_id;while(parent){const p=o.execution.progress[parent]??emptyProgress();p.assembled=false;p.qc="pending";o.execution.progress[parent]=p;parent=this.pack(o,parent).parent_id;}}
  async check(org:string,actor:string,key:string,id:string,revision:number,packageIds:string[],assembled:boolean,notes:string){return this.operation(org,actor,key,["packing.check",id,revision,packageIds,assembled,notes],async m=>{
    const o=await this.order(m,org,id,revision);if(o.status!=="packing")fail(409,"Active packing required");const picks=await this.picks(m,org,id);
    const selected=new Set(packageIds);packageIds.forEach(v=>{this.pack(o,v);this.resetAncestors(o,v);});
    // Children first: bulk completion is explicit, with the same individual checks and audit actor.
    for(const p of [...o.snapshot.packages].reverse().filter(p=>selected.has(p.id))){const children=o.snapshot.packages.filter(c=>c.parent_id===p.id);if(assembled&&children.some(c=>!o.execution.progress[c.id]?.assembled))fail(409,"Complete child packages first");if(assembled&&o.execution.exceptions.some(e=>e.package_id===p.id&&!e.corrected_by))fail(409,"Correct open packing exceptions first");o.execution.progress[p.id]={assembled,qc:"pending",packed_by:actor,packed_at:new Date().toISOString(),notes};if(!assembled)this.resetAncestors(o,p.id);}
    for(const v of this.requirements(o)){let used=0n;for(const p of o.snapshot.packages)if(o.execution.progress[p.id]?.assembled)used+=actualMaterials(o,p.id).filter(a=>a.item_id===v.item_id&&a.unit===v.unit).reduce((sum,a)=>sum+stockUnits(a.quantity),0n);if(used>this.picked(picks,v.item_id,v.unit))fail(409,"Pick the material allocated to these packages first");}
    return this.save(m,org,actor,o);
  });}
  async qc(org:string,actor:string,key:string,id:string,revision:number,packageIds:string[],decision:"accept"|"reject",checks:Record<typeof qcChecks[number],boolean>,notes:string){return this.operation(org,actor,key,["packing.qc",id,revision,packageIds,decision,checks,notes],async m=>{
    const u=await m.findOneBy(User,{id:actor,organization_id:org,is_active:true});if(!u||!["admin","super_admin","manager","inventory_staff"].includes(u.role))fail(403,"Packing checker permission required");
    const o=await this.order(m,org,id,revision);if(o.status!=="packing")fail(409,"Active packing required");if(Object.keys(checks).length!==qcChecks.length||qcChecks.some(k=>typeof checks[k]!=="boolean"))fail(400,"All six packing checks required");if(decision==="accept"&&qcChecks.some(k=>!checks[k]))fail(409,"Required packing checks must pass");
    const selected=new Set(packageIds);packageIds.forEach(v=>this.pack(o,v));for(const p of [...o.snapshot.packages].reverse().filter(p=>selected.has(p.id))){const progress=o.execution.progress[p.id]??emptyProgress();if(!progress.assembled)fail(409,"Assemble before packing QC");if(progress.qc==="accepted")fail(409,"Reopen accepted checks before reinspection");if(decision==="accept"&&(o.snapshot.packages.some(c=>c.parent_id===p.id&&o.execution.progress[c.id]?.qc!=="accepted")||o.execution.exceptions.some(e=>e.package_id===p.id&&!e.corrected_by)))fail(409,"Required child QC and exception correction incomplete");progress.qc=decision==="accept"?"accepted":"rejected";progress.checked_by=actor;progress.checked_at=new Date().toISOString();progress.checks=checks;progress.notes=notes;o.execution.progress[p.id]=progress;}
    // Reset ancestors after the batch so selected parents retain their pre-inspection assembly state.
    if(decision==="reject")for(const id of selected)this.resetAncestors(o,id);
    if(o.snapshot.packages.every(p=>o.execution.progress[p.id]?.qc==="accepted")&&!o.execution.exceptions.some(e=>!e.corrected_by))o.status="ready";return this.save(m,org,actor,o);
  });}
  async exception(org:string,actor:string,key:string,id:string,revision:number,packageId:string,kind:"missing"|"damaged"|"other",notes:string,exceptionId?:string){return this.operation(org,actor,key,["packing.exception",id,revision,packageId,kind,notes,exceptionId],async m=>{
    const o=await this.order(m,org,id,revision);if(o.status!=="packing")fail(409,"Reopen and resume packing before reporting/correcting exceptions");this.pack(o,packageId);
    if(exceptionId){const e=o.execution.exceptions.find(e=>e.id===exceptionId&&e.package_id===packageId);if(!e||e.corrected_by)fail(409,"Open exception required");e.correction=notes;e.corrected_by=actor;e.corrected_at=new Date().toISOString();}else o.execution.exceptions.push({id:randomUUID(),package_id:packageId,kind,notes,reported_by:actor,reported_at:new Date().toISOString()});
    o.execution.progress[packageId]=emptyProgress();this.resetAncestors(o,packageId);return this.save(m,org,actor,o);
  });}
  async change(org:string,actor:string,key:string,id:string,revision:number,packageId:string,kind:"substitute"|"additional",itemId:string,quantity:string,unit:string,reason:string,originalId?:string){return this.operation(org,actor,key,["packing.change",id,revision,packageId,kind,itemId,quantity,unit,reason,originalId],async m=>{
    await this.approval(m,org,actor);const o=await this.order(m,org,id,revision);if(o.status!=="packing")fail(409,"Active packing required");this.pack(o,packageId);const item=await this.item(m,org,itemId);this.quantity(quantity);if(unit!==item.unit)fail(400,"Approved usage requires canonical stock units");
    if(kind==="substitute"){if(!originalId||originalId===itemId||!actualMaterials(o,packageId).some(v=>v.item_id===originalId))fail(400,"Select an existing original material and a different substitute");if((await this.picks(m,org,id)).some(p=>p.item_id===originalId))fail(409,"Substitute before picking the original; already-issued material requires separately approved additional usage");}
    o.execution.changes.push({id:randomUUID(),package_id:packageId,kind,original_item_id:originalId,material:{line_id:randomUUID(),item_id:item.id,name:item.name,unit:item.unit,quantity:stockText(stockUnits(quantity))},reason,approved_by:actor,approved_at:new Date().toISOString()});o.execution.progress[packageId]=emptyProgress();this.resetAncestors(o,packageId);return this.save(m,org,actor,o);
  });}
  async package(org:string,id:string){return this.db.transaction("REPEATABLE READ",async m=>{const rows:{id:string}[]=await m.query(`SELECT id FROM packing_orders WHERE organization_id=$1 AND EXISTS(SELECT 1 FROM jsonb_array_elements(snapshot->'packages') p WHERE p->>'id'=$2)`,[org,id]);if(!rows[0])fail(404,"Package not found");const order=await this.order(m,org,rows[0].id);return {order_id:order.id,number:order.number,batch_code:order.batch_code,project:order.snapshot.project_name,school:order.snapshot.site_name,requirement_revision:order.demand_revision,status:order.status,package:this.pack(order,id),actual_materials:actualMaterials(order,id),progress:order.execution.progress[id]??emptyProgress()};});}
}
