import { DataSource, EntityManager, IsNull, Not } from "typeorm";
import { randomUUID,createHash } from "node:crypto";
import { InventoryItem } from "../entity/InventoryItem";
import { Vendor } from "../entity/Vendor";
import { PurchaseOrder } from "../entity/PurchaseOrder";
import { UomConversion } from "../entity/UomConversion";
import { PlanningProject,PlanningSchoolSite } from "../entity/PlanningProject";
import { ProjectStockReservation,PurchaseRequest,PurchaseGoodsReceipt,SupplyEvent,SupplyOperation,type SupplyLine } from "../entity/SupplyPlanning";
import { DraftKitError } from "./ProductTemplateService";
import { ProjectPlanningService } from "./ProjectPlanningService";
import { verifiedAvailability } from "./PhysicalStockService";
import { reservationTotals,postVerifiedSupplyMovement } from "./SupplyStockService";
import { stockText,stockUnits,convertStock } from "../features/inventory/physicalQuantity";
import { decimalUnits } from "../features/projects/requirementPlanning";
import type { MaterialSummary } from "../features/projects/planningTypes";

export interface LineInput {item_id:string;quantity:string;unit:string;project_id?:string;site_id?:string;qc_required?:boolean;notes?:string}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status:number,message:string):never=>{throw new DraftKitError(status,message);};
export class SupplyPlanningService {
  constructor(private readonly db:DataSource) {}
  private async operation<T>(org:string,actor:string,key:string,input:unknown,work:(m:EntityManager)=>Promise<T>):Promise<T> {
    if(!key||key.length>100)fail(400,"An idempotency key of 1–100 characters is required");
    const fingerprint=createHash("sha256").update(JSON.stringify(input)).digest("hex");
    return this.db.transaction(async m=>{
      // Tenant/key transaction advisory lock serializes duplicate retries before they can write.
      await m.query(`SELECT pg_advisory_xact_lock(hashtextextended($1,0))`,[org+":"+key]);
      const previous=await m.findOneBy(SupplyOperation,{organization_id:org,key});
      if(previous){if(previous.fingerprint!==fingerprint||previous.actor_id!==actor)fail(409,"Idempotency key already used for a different request");return previous.result as T;}
      const result=await work(m);await m.insert(SupplyOperation,{organization_id:org,actor_id:actor,key,fingerprint,result:JSON.parse(JSON.stringify(result)) as unknown});return result;
    });
  }
  private async audit(m:EntityManager,org:string,actor:string,kind:string,record:{id:string},revision:number) {
    await m.insert(SupplyEvent,{organization_id:org,actor_id:actor,kind,record_id:record.id,revision,snapshot:JSON.parse(JSON.stringify(record)) as unknown});
  }
  private async item(m:EntityManager,org:string,id:string,lock=false) {
    if(!uuid.test(id))fail(400,"Invalid inventory identity");
    const item=await m.findOne(InventoryItem,{where:{id,organization_id:org},...(lock?{lock:{mode:"pessimistic_write" as const}}:{})});
    if(!item)fail(404,"Inventory item not found");return item;
  }
  private async projectSite(m:EntityManager,org:string,project:string,site:string) {
    const p=await m.findOne(PlanningProject,{where:{id:project,organization_id:org,archived_at:IsNull()},lock:{mode:"pessimistic_write"}});
    if(!p||!await m.findOneBy(PlanningSchoolSite,{id:site,project_id:project,organization_id:org}))fail(404,"Project/site not found");return p;
  }
  private async canonical(m:EntityManager,org:string,item:InventoryItem,q:string,unit:string) {
    try {
      if(stockUnits(q)<=0n)fail(400,"Quantity must be positive");
      if(unit===item.unit)return {canonical_quantity:stockText(stockUnits(q)),canonical_unit:item.unit};
      const matches=(await m.findBy(UomConversion,{organization_id:org,is_active:true})).filter(c=>c.from_uom===unit&&c.to_uom===item.unit&&(!c.item_id||c.item_id===item.id));
      const specific=matches.filter(c=>c.item_id===item.id);const selected=specific.length?specific:matches;
      if(selected.length!==1)fail(400,"Missing or ambiguous explicit unit conversion");
      const converted=convertStock(q,String(selected[0].conversion_factor));if(stockUnits(converted)<=0n)fail(400,"Quantity must be positive");
      return {canonical_quantity:converted,canonical_unit:item.unit,conversion_id:selected[0].id,conversion_factor:String(selected[0].conversion_factor)};
    }catch(e){if(e instanceof DraftKitError)throw e;fail(400,(e as Error).message);}
  }
  private async line(m:EntityManager,org:string,raw:LineInput):Promise<SupplyLine> {
    if(!raw||Object.keys(raw).some(k=>!["item_id","quantity","unit","project_id","site_id","qc_required","notes"].includes(k))||typeof raw.quantity!=="string"||typeof raw.unit!=="string"||raw.unit.length>30||(raw.qc_required!==undefined&&typeof raw.qc_required!=="boolean")||(raw.notes!==undefined&&(typeof raw.notes!=="string"||raw.notes.length>2000)))fail(400,"Invalid purchase request line");
    if(Boolean(raw.project_id)!==Boolean(raw.site_id))fail(400,"Project and school/site are required together");
    if(raw.project_id&&raw.site_id){if(!uuid.test(raw.project_id)||!uuid.test(raw.site_id))fail(400,"Invalid project/site identity");await this.projectSite(m,org,raw.project_id,raw.site_id);}
    const item=await this.item(m,org,raw.item_id);const converted=await this.canonical(m,org,item,raw.quantity,raw.unit);
    return {id:randomUUID(),...raw,...converted,qc_required:raw.qc_required??true,notes:raw.notes??""};
  }
  async list(org:string,project?:string) {
    return this.db.transaction("REPEATABLE READ",async m=>({
      reservations:await m.find(ProjectStockReservation,{where:{organization_id:org,...(project?{project_id:project}:{})},order:{created_at:"DESC"},take:200}),
      requests:await m.find(PurchaseRequest,{where:{organization_id:org},order:{created_at:"DESC"},take:200}),
      orders:await m.find(PurchaseOrder,{where:{organization_id:org,planning_revision:Not(IsNull())},order:{created_at:"DESC"},take:200}),
      receipts:await m.find(PurchaseGoodsReceipt,{where:{organization_id:org},order:{created_at:"DESC"},take:500}),
      suppliers:await m.find(Vendor,{where:{organization_id:org},order:{name:"ASC"},take:500})}));
  }
  async history(org:string,kind:string,id:string) {return this.db.getRepository(SupplyEvent).find({where:{organization_id:org,kind,record_id:id},order:{revision:"DESC"}});}
  async supplier(org:string,actor:string,key:string,name:string) {
    name=name.trim();if(!name)fail(400,"Supplier name is required");
    return this.operation(org,actor,key,["supplier",name],async m=>{const v=await m.save(Vendor,m.create(Vendor,{organization_id:org,name,vendor_code:"SUP-"+randomUUID()}));await this.audit(m,org,actor,"supplier",v,1);return v;});
  }
  async reserve(org:string,actor:string,key:string,raw:LineInput) {
    return this.operation(org,actor,key,["reserve",raw],async m=>{
      if(!raw.project_id||!raw.site_id)fail(400,"A reservation needs a project and school/site");
      await this.projectSite(m,org,raw.project_id,raw.site_id);
      const item=await this.item(m,org,raw.item_id,true);const c=await this.canonical(m,org,item,raw.quantity,raw.unit);
      await this.checkCapacity(m,org,item,stockUnits(c.canonical_quantity));
      const r=await m.save(ProjectStockReservation,m.create(ProjectStockReservation,{organization_id:org,project_id:raw.project_id,site_id:raw.site_id,item_id:item.id,quantity:c.canonical_quantity,unit:item.unit,created_by:actor,updated_by:actor,reason:raw.notes??""}));
      await this.audit(m,org,actor,"reservation",r,r.revision);return r;
    });
  }
  private async checkCapacity(m:EntityManager,org:string,item:InventoryItem,quantity:bigint,exclude=0n) {
    const v:MaterialSummary={inventory_item_id:item.id,name:item.name,unit:item.unit,gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,incoming:null,immediate_shortage:null,projected_shortage:null};
    await verifiedAvailability(m,org,[v]);if(v.verified_on_hand===null)fail(409,"Unverified stock cannot be reserved");
    const total=(await reservationTotals(m,org,item.id)).total;
    if(quantity+total-exclude>decimalUnits(v.verified_on_hand)/100n)fail(409,"Insufficient verified available stock; reduce quantity for a partial reservation");
  }
  async reservation(org:string,actor:string,key:string,id:string,revision:number,action:"adjust"|"release"|"cancel"|"fulfill",reason:string,quantity?:string,location?:string) {
    return this.operation(org,actor,key,["reservation",id,revision,action,reason,quantity,location],async m=>{
      // All reservation operations use item-before-reservation lock ordering.
      const current=await m.findOneBy(ProjectStockReservation,{id,organization_id:org});if(!current)fail(404,"Reservation not found");
      const item=await this.item(m,org,current.item_id,true);const r=await m.findOne(ProjectStockReservation,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!r)fail(404,"Reservation not found");
      if(r.revision!==revision||r.status!=="active")fail(409,"Reservation changed or finalized; reopen it");
      if(action==="fulfill"){const installed=await m.query(`SELECT to_regclass(current_schema()||'.packing_orders') IS NOT NULL installed`);if(installed[0].installed&&(await m.query(`SELECT 1 FROM packing_orders WHERE organization_id=$1 AND project_id=$2 AND site_id=$3 AND status<>'cancelled' LIMIT 1`,[org,r.project_id,r.site_id])).length)fail(409,"Use packing picks to transfer school reservations without a second stock decrement");}
      if(action==="adjust") {let amount:bigint;try{amount=stockUnits(quantity??"");}catch(e){fail(400,(e as Error).message);}if(amount!<=0n)fail(400,"Quantity must be positive");await this.checkCapacity(m,org,item,amount!,stockUnits(r.quantity));r.quantity=stockText(amount!);}
      else r.status=action==="release"?"released":action==="cancel"?"cancelled":"fulfilled";
      r.revision++;r.updated_by=actor;r.reason=reason;
      if(action==="fulfill") {if(!location)fail(400,"Explicit physical location required for fulfillment");r.fulfillment_location=location;r.fulfillment_ledger_id=randomUUID();}
      const saved=await m.save(r);
      if(action==="fulfill")await postVerifiedSupplyMovement(m,org,item,location!,-stockUnits(r.quantity),actor,{reservation:r.id,ledger_id:r.fulfillment_ledger_id!});
      await this.audit(m,org,actor,"reservation",saved,saved.revision);return saved;
    });
  }
  async request(org:string,actor:string,key:string,lines:LineInput[],notes:string,id?:string,revision?:number) {
    return this.operation(org,actor,key,["request",lines,notes,id,revision],async m=>{
      if(!lines.length||lines.length>100)fail(400,"Purchase requests require 1–100 lines");
      let r:PurchaseRequest;
      if(id){const found=await m.findOne(PurchaseRequest,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!found)fail(404,"Purchase request not found");if(found.revision!==revision||found.status!=="draft")fail(409,"Only the current draft can be edited");r=found;r.revision++;}
      else r=m.create(PurchaseRequest,{organization_id:org,pr_number:"PR-"+randomUUID(),created_by:actor});
      r.lines=[];for(const raw of lines)r.lines.push(await this.line(m,org,raw));r.notes=notes;
      const saved=await m.save(r);await this.audit(m,org,actor,"request",saved,saved.revision);return saved;
    });
  }
  async shortageRequest(org:string,actor:string,key:string,project:string,site:string,revision:number,qc:boolean) {
    return this.operation(org,actor,key,["shortage",project,site,revision,qc],async m=>{
      const p=await this.projectSite(m,org,project,site);if(p.revision!==revision)fail(409,"Project changed; recalculate");
      // Calculation uses this same transaction and project lock, never a separate stale HTTP preview.
      const preview=await new ProjectPlanningService(this.db).previewInTransaction(m,project,org,revision);
      const itemIds=[...new Set(preview.lines.filter(l=>l.site_id===site).map(l=>l.inventory_item_id).filter((id):id is string=>!!id))].sort();
      for(const itemId of itemIds)await this.item(m,org,itemId,true);
      const fresh=await new ProjectPlanningService(this.db).previewInTransaction(m,project,org,revision);
      const lines:SupplyLine[]=[];
      for(const v of fresh.materials) {
        if(!itemIds.includes(v.inventory_item_id))continue;
        if(v.immediate_shortage===null)fail(409,"Unverified stock: purchasing shortage cannot be invented");
        const siteLines=fresh.lines.filter(l=>l.site_id===site&&l.inventory_item_id===v.inventory_item_id&&l.unit===v.unit);
        const siteDemand=siteLines.reduce((n,l)=>n+decimalUnits(l.quantity),0n);
        // Explicit selected site gets at most its demand. Other site allocations are never inferred.
        const coverage:{q:string}[]=await m.query(`SELECT COALESCE(SUM(quantity),0)::text q FROM project_stock_reservations
          WHERE organization_id=$1 AND project_id=$2 AND site_id=$3 AND item_id=$4 AND unit=$5 AND status IN ('active','fulfilled')`,[org,project,site,v.inventory_item_id,v.unit]);
        const ownOrders:{id:string;planning_lines:SupplyLine[]}[]=await m.query(`SELECT id,planning_lines FROM purchase_orders WHERE organization_id=$1 AND planning_revision IS NOT NULL AND approved_by IS NOT NULL AND status='approved'`,[org]);
        let siteIncoming=0n;
        for(const order of ownOrders)for(const line of order.planning_lines??[])if(line.project_id===project&&line.site_id===site&&line.item_id===v.inventory_item_id&&line.canonical_unit===v.unit) {
          const delivered:{q:string;pending:string}[]=await m.query(`SELECT COALESCE(SUM(quantity),0)::text q, COALESCE(SUM(quantity) FILTER(WHERE status IN ('pending','quarantined')),0)::text pending FROM purchase_goods_receipts WHERE organization_id=$1 AND po_id=$2 AND line_id=$3`,[org,order.id,line.id]);
          siteIncoming+=(stockUnits(line.canonical_quantity)-stockUnits(delivered[0].q)+stockUnits(delivered[0].pending))*100n;
        }
        const remainingSite=siteDemand-stockUnits(coverage[0].q)*100n-siteIncoming;
        const shortage=decimalUnits(v.projected_shortage??v.immediate_shortage);const q=shortage<remainingSite?shortage:remainingSite;if(q<=0n)continue;
        if(q%100n)fail(400,"Shortage cannot be represented in stock units; decide a purchasing quantity explicitly");
        const l=await this.line(m,org,{item_id:v.inventory_item_id,quantity:stockText(q/100n),unit:v.unit,project_id:project,site_id:site,qc_required:qc});
        l.demand_revision=revision;l.demand_basis=siteLines;lines.push(l);
      }
      if(!lines.length)fail(409,"No uncovered demand for the selected site");
      const r=await m.save(PurchaseRequest,m.create(PurchaseRequest,{organization_id:org,pr_number:"PR-"+randomUUID(),lines,notes:"Generated from verified project shortage; selected site allocation",created_by:actor}));await this.audit(m,org,actor,"request",r,r.revision);return r;
    });
  }
  async requestTransition(org:string,actor:string,key:string,id:string,revision:number,action:"review"|"approve"|"cancel") {
    return this.operation(org,actor,key,["request",id,revision,action],async m=>{
      const r=await m.findOne(PurchaseRequest,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!r)fail(404,"Purchase request not found");
      if(r.revision!==revision)fail(409,"Purchase request changed; reopen it");
      if(action==="review"){if(r.status!=="draft")fail(409,"Review a draft request");r.status="reviewed";r.reviewed_by=actor;}
      else if(action==="approve"){if(r.status!=="reviewed")fail(409,"Review required before approval");r.status="approved";r.approved_by=actor;}
      else {if(!["draft","reviewed","approved"].includes(r.status))fail(409,"Ordered/final requests cannot be cancelled");r.status="cancelled";}
      r.revision++;const saved=await m.save(r);await this.audit(m,org,actor,"request",saved,saved.revision);return saved;
    });
  }
  async order(org:string,actor:string,key:string,requestId:string,revision:number,supplier:string) {
    return this.operation(org,actor,key,["order",requestId,revision,supplier],async m=>{
      const r=await m.findOne(PurchaseRequest,{where:{id:requestId,organization_id:org},lock:{mode:"pessimistic_write"}});if(!r)fail(404,"Purchase request not found");
      if(r.revision!==revision||r.status!=="approved")fail(409,"Current approved request required");
      if(!await m.findOneBy(Vendor,{id:supplier,organization_id:org}))fail(404,"Supplier not found");
      const po=await m.save(PurchaseOrder,m.create(PurchaseOrder,{organization_id:org,vendor_id:supplier,po_number:"PO-"+randomUUID(),order_date:new Date(),status:"draft",total_amount:0,planning_revision:1,planning_lines:structuredClone(r.lines),purchase_request_id:r.id,created_by:actor}));
      r.status="ordered";r.revision++;await m.save(r);await this.audit(m,org,actor,"request",r,r.revision);await this.audit(m,org,actor,"order",po,1);return po;
    });
  }
  async orderTransition(org:string,actor:string,key:string,id:string,revision:number,action:"review"|"approve"|"cancel") {
    return this.operation(org,actor,key,["order",id,revision,action],async m=>{
      const po=await m.findOne(PurchaseOrder,{where:{id,organization_id:org,planning_revision:Not(IsNull())},lock:{mode:"pessimistic_write"}});if(!po)fail(404,"Verified purchase order not found");
      if(po.planning_revision!==revision)fail(409,"Purchase order changed; reopen it");
      if(action==="review"){if(po.status!=="draft"||po.reviewed_by)fail(409,"Review an unreviewed draft order");po.reviewed_by=actor;}
      else if(action==="approve"){if(po.status!=="draft"||!po.reviewed_by)fail(409,"Review required before order approval");po.status="approved";po.approved_by=actor;}
      else {if(!["draft","approved"].includes(po.status))fail(409,"Order is finalized");if(await m.countBy(PurchaseGoodsReceipt,{organization_id:org,po_id:id,status:Not("rejected" as const)}))fail(409,"Resolve all receipts before cancelling the order");po.status="cancelled";}
      po.planning_revision++;const saved=await m.save(po);await this.audit(m,org,actor,"order",saved,saved.planning_revision!);return saved;
    });
  }
  async receive(org:string,actor:string,key:string,id:string,revision:number,lineId:string,q:string,unit:string,location:string) {
    return this.operation(org,actor,key,["receive",id,revision,lineId,q,unit,location],async m=>{
      const po=await m.findOne(PurchaseOrder,{where:{id,organization_id:org,planning_revision:Not(IsNull())},lock:{mode:"pessimistic_write"}});if(!po)fail(404,"Verified purchase order not found");
      if(po.planning_revision!==revision||po.status!=="approved"||!po.approved_by)fail(409,"Current approved order required before receipt");
      const l=po.planning_lines!.find(l=>l.id===lineId);if(!l)fail(404,"Purchase order line not found");
      const item=await this.item(m,org,l.item_id,true);const converted=await this.canonical(m,org,item,q,unit);
      const delivered:{q:string}[]=await m.query(`SELECT COALESCE(SUM(quantity),0)::text q FROM purchase_goods_receipts WHERE organization_id=$1 AND po_id=$2 AND line_id=$3`,[org,id,lineId]);
      if(stockUnits(delivered[0].q)+stockUnits(converted.canonical_quantity)>stockUnits(l.canonical_quantity))fail(409,"Receipt exceeds authorized remaining quantity; a new approved order is required");
      const scope=await m.query(`SELECT locations FROM physical_stock_scopes WHERE organization_id=$1 AND item_id=$2 AND unit=$3`,[org,item.id,item.unit]) as {locations:string[]}[];
      if(!scope[0]?.locations.includes(location))fail(409,"Receipt location must belong to the declared verified item scope");
      const g=await m.save(PurchaseGoodsReceipt,m.create(PurchaseGoodsReceipt,{organization_id:org,po_id:id,line_id:lineId,item_id:item.id,quantity:converted.canonical_quantity,unit:item.unit,location,received_by:actor,source:{quantity:q,unit,conversion_id:converted.conversion_id,conversion_factor:converted.conversion_factor}}));
      await this.audit(m,org,actor,"receipt",g,1);
      // Non-QC orders explicitly authorize acceptance at receipt; QC orders require an inspector action.
      if(!l.qc_required)return this.inspectInTransaction(m,org,actor,g,"accept","PO does not require QC");return g;
    });
  }
  private async inspectInTransaction(m:EntityManager,org:string,actor:string,g:PurchaseGoodsReceipt,action:"accept"|"reject"|"quarantine",reason:string) {
    const item=await this.item(m,org,g.item_id,true);
    if(!["pending","quarantined"].includes(g.status))fail(409,"Receipt already finalized");
    if(action==="quarantine"&&g.status==="quarantined")fail(409,"Receipt already quarantined");
    g.status=action==="accept"?"accepted":action==="reject"?"rejected":"quarantined";g.inspected_by=actor;g.reason=reason;g.revision++;
    if(action==="accept")g.ledger_id=randomUUID();const saved=await m.save(g);
    if(action==="accept")await postVerifiedSupplyMovement(m,org,item,g.location,stockUnits(g.quantity),actor,{receipt:g.id,ledger_id:g.ledger_id!});
    await this.audit(m,org,actor,"receipt",saved,saved.revision);return saved;
  }
  async inspect(org:string,actor:string,key:string,id:string,revision:number,action:"accept"|"reject"|"quarantine",reason:string) {
    return this.operation(org,actor,key,["inspect",id,revision,action,reason],async m=>{
      const current=await m.findOneBy(PurchaseGoodsReceipt,{id,organization_id:org});if(!current)fail(404,"Goods receipt not found");
      const po=await m.findOne(PurchaseOrder,{where:{id:current.po_id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!po||po.status!=="approved")fail(409,"Approved order required");
      const g=await m.findOne(PurchaseGoodsReceipt,{where:{id,organization_id:org},lock:{mode:"pessimistic_write"}});if(!g)fail(404,"Goods receipt not found");
      if(g.revision!==revision)fail(409,"Goods receipt changed; reopen it");return this.inspectInTransaction(m,org,actor,g,action,reason);
    });
  }
}
