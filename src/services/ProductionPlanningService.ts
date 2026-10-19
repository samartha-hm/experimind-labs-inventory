import {DataSource,EntityManager,IsNull} from "typeorm";
import {assertExecutionSupported} from "./ExecutionReadinessService";
import {randomUUID,createHash} from "node:crypto";
import {InventoryItem} from "../entity/InventoryItem";
import {User} from "../entity/User";
import {UomConversion} from "../entity/UomConversion";
import {PlanningProject,PlanningSchoolSite} from "../entity/PlanningProject";
import {SupplyOperation,SupplyEvent} from "../entity/SupplyPlanning";
import {ProductionRecipe,ProductionWorkOrder,ProductionInputReservation,ProductionInputIssue,ProductionBatch,ProductionQcDecision,type RecipeDefinition,type RecipeInput} from "../entity/ProductionPlanning";
import {DraftKitError} from "./ProductTemplateService";
import {verifiedAvailability,locationBalance} from "./PhysicalStockService";
import {reservationTotals} from "./SupplyStockService";
import {ProjectPlanningService} from "./ProjectPlanningService";
import {stockUnits,stockText,convertStock} from "../features/inventory/physicalQuantity";
import {decimalUnits} from "../features/projects/requirementPlanning";
import type {MaterialSummary} from "../features/projects/planningTypes";
const fail=(status:number,message:string):never=>{throw new DraftKitError(status,message);};
const ceil=(a:bigint,b:bigint)=>(a+b-1n)/b;
export interface WorkOrderInput {recipe_id?:string;definition?:RecipeDefinition;quantity:string;unit:string;project_id?:string;site_id?:string;demand_revision?:number;due_date?:string;priority?:ProductionWorkOrder["priority"];assigned_employee_id?:string;assigned_team?:string;instructions?:string}
export class ProductionPlanningService {
  constructor(private readonly db:DataSource){}
  private async operation<T>(org:string,actor:string,key:string,input:unknown,run:(m:EntityManager)=>Promise<T>) {
    if(!key||key.length>100)fail(400,"Idempotency key required");
    const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.db.transaction(async m=>{
      await assertExecutionSupported(m);
      await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[org+":"+key]);
      const old=await m.findOneBy(SupplyOperation,{organization_id:org,key});
      if(old){if(old.fingerprint!==fingerprint||old.actor_id!==actor)fail(409,"Idempotency key already used");return old.result as T;}
      const result=await run(m);await m.insert(SupplyOperation,{organization_id:org,actor_id:actor,key,fingerprint,result:JSON.parse(JSON.stringify(result)) as unknown});return result;
    });
  }
  private async audit(m:EntityManager,org:string,actor:string,kind:string,record:{id:string;revision:number}) {
    await m.insert(SupplyEvent,{organization_id:org,actor_id:actor,kind,record_id:record.id,revision:record.revision,snapshot:JSON.parse(JSON.stringify(record)) as unknown});
  }
  private async item(m:EntityManager,org:string,id:string,lock=false) {
    if(typeof id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))fail(400,"Invalid inventory identity");
    const item=await m.findOne(InventoryItem,{where:{id,organization_id:org},...(lock?{lock:{mode:"pessimistic_write" as const}}:{})});
    if(!item)fail(404,"Inventory item not found");return item;
  }
  private quantity(q:string,zero=false) {try{const v=stockUnits(q);if(!zero&&v===0n)fail(400,"Quantity must be positive");return v;}catch(e){if(e instanceof DraftKitError)throw e;return fail(400,(e as Error).message);}}
  private async canonical(m:EntityManager,org:string,item:InventoryItem,q:string,unit:string) {
    this.quantity(q);if(unit===item.unit)return {canonical_quantity:stockText(stockUnits(q))};
    const matches=(await m.findBy(UomConversion,{organization_id:org,is_active:true})).filter(c=>c.from_uom===unit&&c.to_uom===item.unit&&(!c.item_id||c.item_id===item.id));
    const own=matches.filter(c=>c.item_id===item.id),selected=own.length?own:matches;
    if(selected.length!==1)fail(400,"Missing or ambiguous explicit unit conversion");
    try{return {canonical_quantity:convertStock(q,String(selected[0].conversion_factor)),conversion_id:selected[0].id,conversion_factor:String(selected[0].conversion_factor)};}catch(e){return fail(400,(e as Error).message);}
  }
  private async definition(m:EntityManager,org:string,raw:RecipeDefinition):Promise<RecipeDefinition> {
    if(!raw||!Array.isArray(raw.inputs)||raw.inputs.length<1||raw.inputs.length>100)fail(400,"One to 100 manufacturing inputs required");
    const output=await this.item(m,org,raw.output_item_id),yieldQ=await this.canonical(m,org,output,raw.yield_quantity,raw.unit);
    const ids=new Set<string>();const inputs:RecipeInput[]=[];
    for(const v of raw.inputs){if(!v||typeof v.quantity!=="string"||typeof v.unit!=="string"||v.unit.length>30)fail(400,"Invalid recipe input");
      if(ids.has(v.item_id)||v.item_id===output.id)fail(400,"Duplicate or self-consuming recipe input");ids.add(v.item_id);
      const item=await this.item(m,org,v.item_id);const scrap=this.quantity(v.scrap_percent??"0",true);if(scrap>1000000n)fail(400,"Scrap allowance must be between zero and 100 percent");
      inputs.push({item_id:item.id,quantity:v.quantity,unit:v.unit,scrap_percent:stockText(scrap),...await this.canonical(m,org,item,v.quantity,v.unit)});
    }
    for(const text of [raw.instructions,raw.specification,raw.concentration])if(text!==undefined&&(typeof text!=="string"||text.length>5000))fail(400,"Invalid recipe notes");
    return {output_item_id:output.id,yield_quantity:yieldQ.canonical_quantity,unit:output.unit,inputs,instructions:raw.instructions??"",specification:raw.specification??"",concentration:raw.concentration??""};
  }
  async recipe(org:string,actor:string,key:string,name:string,raw:RecipeDefinition,id?:string,revision?:number,fork=false) {
    return this.operation(org,actor,key,["production.recipe",name,raw,id,revision,fork],async m=>{
      if(!name.trim()||name.length>200)fail(400,"Recipe name required");
      let old:ProductionRecipe|null=null;if(id){old=await m.findOne(ProductionRecipe,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!old)fail(404,"Recipe not found");if(old.revision!==revision)fail(409,"Recipe changed; reopen it");if(!fork&&old.status!=="draft")fail(409,"Create a new version to edit an approved recipe");}
      const definition=await this.definition(m,org,raw);let r:ProductionRecipe;
      if(old&&!fork){old.name=name.trim();old.definition=definition;old.revision++;r=await m.save(old);}
      else {const family=old?.family_id??randomUUID();await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[org+":"+family]);const versions=await m.findBy(ProductionRecipe,{organization_id:org,family_id:family});r=await m.save(ProductionRecipe,m.create(ProductionRecipe,{organization_id:org,family_id:family,version:Math.max(0,...versions.map(v=>v.version))+1,name:name.trim(),definition,created_by:actor}));}
      await this.audit(m,org,actor,"production_recipe",r);return r;
    });
  }
  async approveRecipe(org:string,actor:string,key:string,id:string,revision:number) {
    return this.operation(org,actor,key,["production.recipe.approve",id,revision],async m=>{const r=await m.findOne(ProductionRecipe,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!r)fail(404,"Recipe not found");if(r.revision!==revision||r.status!=="draft")fail(409,"Recipe changed or approved");r.status="approved";r.approved_by=actor;r.revision++;await m.save(r);await this.audit(m,org,actor,"production_recipe",r);return r;});
  }
  async create(org:string,actor:string,key:string,raw:WorkOrderInput) {
    return this.operation(org,actor,key,["production.create",raw],async m=>{
      if(Boolean(raw.project_id)!==Boolean(raw.site_id)||Boolean(raw.project_id)!==Boolean(raw.demand_revision))fail(400,"Project, site and current requirement revision required together");
      let recipe:ProductionRecipe|null=null;
      if(raw.recipe_id){recipe=await m.findOneBy(ProductionRecipe,{id:raw.recipe_id,organization_id:org,status:"approved"});if(!recipe)fail(404,"Approved recipe not found");if(raw.definition)fail(400,"Choose a recipe or explicit inputs");}
      const def=recipe?.definition??await this.definition(m,org,raw.definition!);const item=await this.item(m,org,def.output_item_id);
      const planned=(await this.canonical(m,org,item,raw.quantity,raw.unit)).canonical_quantity;
      if(raw.project_id){const p=await m.findOne(PlanningProject,{where:{id:raw.project_id,organization_id:org,archived_at:IsNull()},lock:{mode:"pessimistic_write"}});
        if(!p||!await m.findOneBy(PlanningSchoolSite,{id:raw.site_id,project_id:p.id,organization_id:org}))fail(404,"Project/site not found");
        const preview=await new ProjectPlanningService(this.db).previewInTransaction(m,p.id,org,raw.demand_revision!);
        const demand=preview.lines.filter(l=>l.site_id===raw.site_id&&l.inventory_item_id===item.id&&l.unit===item.unit).reduce((sum,l)=>sum+decimalUnits(l.quantity),0n);
        if(demand===0n||stockUnits(planned)*100n>demand)fail(400,"Output exceeds the selected site's manufacturing requirement");
      }
      if(raw.assigned_employee_id&&!await m.findOneBy(User,{id:raw.assigned_employee_id,organization_id:org,is_active:true}))fail(404,"Assigned employee not found");
      const inputs=await Promise.all(def.inputs.map(async source=>{const input=await this.item(m,org,source.item_id);return {id:randomUUID(),item_id:input.id,unit:input.unit,source,planned_quantity:stockText(ceil(stockUnits(source.canonical_quantity)*stockUnits(planned)*(1000000n+stockUnits(source.scrap_percent)),stockUnits(def.yield_quantity)*1000000n))};}));
      const w=await m.save(ProductionWorkOrder,m.create(ProductionWorkOrder,{organization_id:org,number:"WO-"+randomUUID(),output_item_id:item.id,recipe_id:recipe?.id??null,recipe_snapshot:def,project_id:raw.project_id??null,site_id:raw.site_id??null,demand_revision:raw.demand_revision??null,planned_quantity:planned,unit:item.unit,inputs,due_date:raw.due_date??null,priority:raw.priority??"normal",assigned_employee_id:raw.assigned_employee_id??null,assigned_team:raw.assigned_team??"",instructions:raw.instructions??def.instructions,created_by:actor,updated_by:actor}));
      await this.audit(m,org,actor,"production_order",w);return w;
    });
  }
  private async order(m:EntityManager,org:string,id:string,revision:number) {
    const w=await m.findOne(ProductionWorkOrder,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!w)fail(404,"Work order not found");if(w.revision!==revision||["completed","cancelled"].includes(w.status))fail(409,"Work order changed or finalized; reopen it");return w;
  }
  private async available(m:EntityManager,org:string,item:InventoryItem) {
    const v:MaterialSummary={inventory_item_id:item.id,name:item.name,unit:item.unit,gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,incoming:null,immediate_shortage:null,projected_shortage:null};
    await verifiedAvailability(m,org,[v]);if(v.verified_on_hand===null)fail(409,"Stocktake with complete location coverage required");return decimalUnits(v.verified_on_hand)/100n;
  }
  private async save(m:EntityManager,org:string,actor:string,w:ProductionWorkOrder) {w.revision++;w.updated_by=actor;await m.save(w);await this.audit(m,org,actor,"production_order",w);return w;}
  async assign(org:string,actor:string,key:string,id:string,revision:number,team:string,employee?:string) {
    return this.operation(org,actor,key,["production.assign",id,revision,team,employee],async m=>{const w=await this.order(m,org,id,revision);if(employee&&!await m.findOneBy(User,{id:employee,organization_id:org,is_active:true}))fail(404,"Assigned employee not found");w.assigned_team=team;w.assigned_employee_id=employee??null;return this.save(m,org,actor,w);});
  }
  async transition(org:string,actor:string,key:string,id:string,revision:number,action:"release"|"reserve"|"start"|"complete"|"cancel",reason:string) {
    return this.operation(org,actor,key,["production.transition",id,revision,action,reason],async m=>{
      const w=await this.order(m,org,id,revision);
      if(action==="release"){if(w.status!=="draft")fail(409,"Only drafts can be released");await this.available(m,org,await this.item(m,org,w.output_item_id,true));w.status="released";w.released_by=actor;}
      if(action==="reserve"){if(w.status!=="released")fail(409,"Reserve inputs before starting");if(await m.countBy(ProductionInputReservation,{organization_id:org,order_id:id}))fail(409,"Inputs already allocated");
        for(const line of [...w.inputs].sort((a,b)=>a.item_id.localeCompare(b.item_id))){const item=await this.item(m,org,line.item_id,true);const free=await this.available(m,org,item)-(await reservationTotals(m,org,item.id)).total;if(stockUnits(line.planned_quantity)>free)fail(409,"Insufficient verified inputs; other reservations have priority");await m.insert(ProductionInputReservation,{organization_id:org,order_id:id,line_id:line.id,item_id:item.id,quantity:line.planned_quantity,unit:item.unit,created_by:actor});}}
      if(action==="start"){if(w.status!=="released")fail(409,"Release before starting");w.status="in_progress";}
      if(action==="complete"||action==="cancel"){
        const batches=await m.findBy(ProductionBatch,{organization_id:org,order_id:id});if(batches.some(b=>stockUnits(b.accepted)+stockUnits(b.rejected)!==stockUnits(b.quantity)))fail(409,"Resolve pending QC and rework before finalizing");
        if(action==="complete"&&(w.status!=="in_progress"||!batches.length))fail(409,"Report and inspect output before completing");if(!reason.trim())fail(400,"Finalization reason required");
        for(const v of await m.findBy(ProductionInputReservation,{organization_id:org,order_id:id,status:"active"})){await this.item(m,org,v.item_id,true);v.status="released";await m.save(v);}w.status=action==="complete"?"completed":"cancelled";
      }
      w.reason=reason;return this.save(m,org,actor,w);
    });
  }
  private async post(m:EntityManager,org:string,actor:string,item:InventoryItem,location:string,quantity:bigint,id:string,ledger:string,kind:"issue"|"qc") {
    const b=await locationBalance(m,org,item.id,location);if(b.quantity===null||b.unit!==item.unit)fail(409,"Count this output/input location first");const balance=stockUnits(b.quantity)+quantity;if(balance<0n)fail(409,"Insufficient input stock at this location");
    await m.query(`INSERT INTO stock_ledger(id,organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type,reference_type,reference_id,reason_code,actor_id,actor_name,verified_unit,verification_entry_id,physical_location,physical_sequence,production_issue_id,production_qc_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,0,$8, $9,$10::text,'PRODUCTION',$11::uuid,$11::text,$12,$10::uuid,$13,$14,$15,$16)`,[ledger,org,item.id,item.name,item.sku,stockText(quantity),stockText(balance),kind==="issue"?"KIT_CONSUMPTION":"KIT_PRODUCTION",kind==="issue"?"production_issue":"production_qc",id,actor,item.unit,location,b.sequence+1,kind==="issue"?id:null,kind==="qc"?id:null]);
  }
  async issue(org:string,actor:string,key:string,id:string,revision:number,reservation:string,quantity:string,unit:string,scrap:string,location:string,reason:string) {
    return this.operation(org,actor,key,["production.issue",id,revision,reservation,quantity,unit,scrap,location,reason],async m=>{
      const w=await this.order(m,org,id,revision);if(w.status!=="in_progress")fail(409,"Start production first");
      const r=await m.findOneBy(ProductionInputReservation,{id:reservation,organization_id:org,order_id:id,status:"active"});if(!r)fail(404,"Active input allocation not found");const item=await this.item(m,org,r.item_id,true);
      const q=(await this.canonical(m,org,item,quantity,unit)).canonical_quantity;let scrapQ="0.0000";if(this.quantity(scrap,true)>0n)scrapQ=(await this.canonical(m,org,item,scrap,unit)).canonical_quantity;
      if(stockUnits(q)>stockUnits(r.quantity)||stockUnits(scrapQ)>stockUnits(q))fail(400,"Issue or scrap exceeds authorized allocation");if(!location.trim()||!reason.trim())fail(400,"Physical location and issue reason required");
      r.quantity=stockText(stockUnits(r.quantity)-stockUnits(q));if(stockUnits(r.quantity)===0n)r.status="consumed";await m.save(r);
      const i=await m.save(ProductionInputIssue,m.create(ProductionInputIssue,{organization_id:org,order_id:id,reservation_id:r.id,item_id:item.id,quantity:q,scrap_quantity:scrapQ,unit:item.unit,location,reason,issued_by:actor,ledger_id:randomUUID()}));await this.post(m,org,actor,item,location,-stockUnits(q),i.id,i.ledger_id,"issue");await this.save(m,org,actor,w);return i;
    });
  }
  async output(org:string,actor:string,key:string,id:string,revision:number,quantity:string,unit:string,code:string,location:string,notes:string) {
    return this.operation(org,actor,key,["production.output",id,revision,quantity,unit,code,location,notes],async m=>{
      const w=await this.order(m,org,id,revision);if(w.status!=="in_progress")fail(409,"Start production first");const item=await this.item(m,org,w.output_item_id,true);const q=(await this.canonical(m,org,item,quantity,unit)).canonical_quantity;
      const batches=await m.findBy(ProductionBatch,{organization_id:org,order_id:id});const total=batches.reduce((s,b)=>s+stockUnits(b.quantity),stockUnits(q));if(total>stockUnits(w.planned_quantity))fail(400,"Output exceeds authorized quantity");
      const issues=await m.findBy(ProductionInputIssue,{organization_id:org,order_id:id});for(const line of w.inputs){const useful=issues.filter(i=>i.item_id===line.item_id).reduce((s,i)=>s+stockUnits(i.quantity)-stockUnits(i.scrap_quantity),0n);if(useful<ceil(total*stockUnits(line.source.canonical_quantity),stockUnits(w.recipe_snapshot!.yield_quantity)))fail(409,"Issue sufficient inputs after scrap before reporting output");}
      if(!code.trim()||!location.trim())fail(400,"Batch and location required");const b=await locationBalance(m,org,item.id,location);if(b.quantity===null||b.unit!==item.unit)fail(409,"Count this finished-output location first");
      const batch=await m.save(ProductionBatch,m.create(ProductionBatch,{organization_id:org,order_id:id,batch_code:code,quantity:q,location,notes,recorded_by:actor}));await this.save(m,org,actor,w);return batch;
    });
  }
  async qc(org:string,actor:string,key:string,id:string,revision:number,batchId:string,batchRevision:number,quantity:string,decision:ProductionQcDecision["decision"],notes:string) {
    return this.operation(org,actor,key,["production.qc",id,revision,batchId,batchRevision,quantity,decision,notes],async m=>{
      const w=await this.order(m,org,id,revision);if(w.status!=="in_progress")fail(409,"Active production required");const b=await m.findOneBy(ProductionBatch,{id:batchId,organization_id:org,order_id:id});if(!b)fail(404,"Batch not found");if(b.revision!==batchRevision)fail(409,"Batch changed");
      const q=this.quantity(quantity);if(!notes.trim())fail(400,"QC notes required");
      const pending=stockUnits(b.quantity)-stockUnits(b.accepted)-stockUnits(b.rejected)-stockUnits(b.rework);if(q>(decision==="resubmit"?stockUnits(b.rework):pending))fail(400,"QC quantity exceeds eligible output");
      if(decision==="accept")b.accepted=stockText(stockUnits(b.accepted)+q);if(decision==="reject")b.rejected=stockText(stockUnits(b.rejected)+q);if(decision==="rework")b.rework=stockText(stockUnits(b.rework)+q);if(decision==="resubmit")b.rework=stockText(stockUnits(b.rework)-q);
      b.revision++;await m.save(b);const d=await m.save(ProductionQcDecision,m.create(ProductionQcDecision,{organization_id:org,order_id:id,batch_id:b.id,quantity:stockText(q),decision,notes,inspected_by:actor,ledger_id:decision==="accept"?randomUUID():null}));
      if(decision==="accept"){const item=await this.item(m,org,w.output_item_id,true);await this.available(m,org,item);await this.post(m,org,actor,item,b.location,q,d.id,d.ledger_id!,"qc");}await this.save(m,org,actor,w);return d;
    });
  }
  async list(org:string) {return this.db.transaction("REPEATABLE READ",async m=>({recipes:await m.find(ProductionRecipe,{where:{organization_id:org},order:{created_at:"DESC"},take:200}),orders:await m.find(ProductionWorkOrder,{where:{organization_id:org},order:{created_at:"DESC"},take:200})}));}
  async detail(org:string,id:string) {return this.db.transaction("REPEATABLE READ",async m=>{
    const w=await m.findOneBy(ProductionWorkOrder,{id,organization_id:org});if(!w)fail(404,"Work order not found");const availability=[];
    for(const line of w.inputs){const item=await this.item(m,org,line.item_id);let onhand:string|null=null;try{onhand=stockText(await this.available(m,org,item));}catch(e){if(!(e instanceof DraftKitError&&e.status===409))throw e;}const allocated=await reservationTotals(m,org,item.id);availability.push({...line,name:item.name,verified_on_hand:onhand,active_reservations:stockText(allocated.total),available:onhand===null?null:stockText(stockUnits(onhand)-allocated.total)});}
    return {order:w,availability,reservations:await m.findBy(ProductionInputReservation,{organization_id:org,order_id:id}),issues:await m.findBy(ProductionInputIssue,{organization_id:org,order_id:id}),batches:await m.findBy(ProductionBatch,{organization_id:org,order_id:id}),qc:await m.findBy(ProductionQcDecision,{organization_id:org,order_id:id}),history:await m.find(SupplyEvent,{where:{organization_id:org,kind:"production_order",record_id:id},order:{revision:"DESC"}})};
  });}
}
