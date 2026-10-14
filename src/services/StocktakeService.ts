import { supplyAvailability } from "./SupplyStockService";
import { randomUUID } from "node:crypto";
import { DataSource, EntityManager } from "typeorm";
import { Stocktake, StocktakeEvent, PhysicalStockScope, type StocktakeTarget, type CountEntry } from "../entity/Stocktake";
import { InventoryItem } from "../entity/InventoryItem";
import { UomConversion } from "../entity/UomConversion";
import { DraftKitError } from "./ProductTemplateService";
import { stockUnits, stockText, convertStock } from "../features/inventory/physicalQuantity";
import { locationBalance, verifiedAvailability } from "./PhysicalStockService";
import type { MaterialSummary } from "../features/projects/planningTypes";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function targets(raw: unknown): StocktakeTarget[] {
  if (!Array.isArray(raw) || !raw.length || raw.length > 100) throw new DraftKitError(400,"Select 1–100 stocktake items");
  const seen = new Set<string>();
  return raw.map((t: unknown) => {
    if (!t || typeof t !== "object" || Array.isArray(t)) throw new DraftKitError(400,"Invalid target");
    const v = t as Record<string,unknown>;
    if (Object.keys(v).some(k => !["item_id","locations","complete_coverage"].includes(k)) || typeof v.item_id !== "string" || !uuid.test(v.item_id)
      || seen.has(v.item_id) || typeof v.complete_coverage !== "boolean" || !Array.isArray(v.locations) || !v.locations.length || v.locations.length > 30)
      throw new DraftKitError(400,"Invalid or duplicate stocktake item; explicitly declare coverage");
    seen.add(v.item_id);
    if (v.locations.some(l => typeof l !== "string" || !l.trim() || l.trim() !== l || l.length > 100 || /[\u0000-\u001f]/.test(l))
      || new Set(v.locations).size !== v.locations.length) throw new DraftKitError(400,"Invalid or duplicate locations");
    return { item_id: v.item_id, locations: [...v.locations as string[]].sort(), complete_coverage: v.complete_coverage };
  });
}
export class StocktakeService {
  constructor(private readonly db: DataSource) {}
  private async owned(m: EntityManager, org: string, id: string, revision?: number, lock=false) {
    const s = await m.findOne(Stocktake,{where:{id,organization_id:org},...(revision === undefined && !lock ? {} : {lock:{mode:"pessimistic_write" as const}})});
    if (!s) throw new DraftKitError(404,"Stocktake not found");
    if (revision !== undefined && s.revision !== revision) throw new DraftKitError(409,"Stocktake changed; reopen it"); return s;
  }
  private async persist(m: EntityManager, s: Stocktake, actor: string) {
    const saved = await m.save(s); await m.insert(StocktakeEvent,{organization_id:s.organization_id,stocktake_id:s.id,actor_id:actor,revision:s.revision,snapshot:JSON.parse(JSON.stringify(saved)) as Stocktake});
    return saved;
  }
  private async validateTargets(m: EntityManager, org: string, list: StocktakeTarget[]) {
    for (const t of list) {
      const item = await m.findOneBy(InventoryItem,{id:t.item_id,organization_id:org});
      if (!item || !item.unit?.trim()) throw new DraftKitError(400,"Select owned inventory items with explicit units");
      const scope = await m.findOneBy(PhysicalStockScope,{organization_id:org,item_id:t.item_id});
      if (scope && (scope.unit !== item.unit || JSON.stringify(scope.locations) !== JSON.stringify(t.locations)))
        throw new DraftKitError(409,"Declared verified scope cannot be silently changed; use its existing locations and coverage");
    }
  }
  async create(org: string, actor: string, name: string, notes: string, raw: unknown) {
    const list = targets(raw); return this.db.transaction(async m => {
      await this.validateTargets(m,org,list);
      return this.persist(m,m.create(Stocktake,{organization_id:org,created_by:actor,name,notes,targets:list,entries:[],revision:1}),actor);
    });
  }
  async list(org: string) { return this.db.getRepository(Stocktake).find({where:{organization_id:org},order:{created_at:"DESC"},take:200}); }
  async view(org: string,id: string) {
    return this.db.transaction("REPEATABLE READ",async m => {
      const session = await this.owned(m,org,id);
      const missing = session.targets.flatMap(t => t.locations.filter(l => !session.entries.some(e => e.item_id === t.item_id && e.location === l)).map(location => ({item_id:t.item_id,location})));
      const counts = await Promise.all(session.entries.map(async e => {
        const item = await m.findOneByOrFail(InventoryItem,{id:e.item_id,organization_id:org});
        const balance = await locationBalance(m,org,e.item_id,e.location);
        return {...e,verified_baseline:balance.quantity,legacy_quantity:String(item.quantity),legacy_status:"unverified",
          discrepancy:e.canonical_quantity !== undefined && e.baseline !== null && e.baseline !== undefined ? stockText(stockUnits(e.canonical_quantity)-stockUnits(e.baseline)) : null};
      }));
      return {session,missing,counts};
    });
  }
  async edit(org: string,id: string,actor: string,revision: number,name: string,notes: string,raw: unknown) {
    const list = targets(raw); return this.db.transaction(async m => {
      const s=await this.owned(m,org,id,revision); if(s.status!=="draft") throw new DraftKitError(409,"Only drafts can be edited");
      await this.validateTargets(m,org,list);
      if(s.entries.some(e=>!list.some(t=>t.item_id===e.item_id&&t.locations.includes(e.location)))) throw new DraftKitError(400,"Remove counts before removing their targets");
      s.name=name;s.notes=notes;s.targets=list;s.revision++;return this.persist(m,s,actor);
    });
  }
  async count(org: string,id: string,actor: string,revision: number,itemId: string,location: string,quantity: string,unit: string,remove=false) {
    try { stockUnits(quantity); } catch(e) { throw new DraftKitError(400,(e as Error).message); }
    return this.db.transaction(async m => {
      const s=await this.owned(m,org,id,revision); if(s.status!=="draft") throw new DraftKitError(409,"Only drafts accept counts");
      if(!s.targets.some(t=>t.item_id===itemId&&t.locations.includes(location))) throw new DraftKitError(400,"Count must match a declared item/location");
      const existing=s.entries.find(e=>e.item_id===itemId&&e.location===location);
      s.entries=s.entries.filter(e=>e!==existing);
      if(!remove) s.entries.push({id:existing?.id??randomUUID(),item_id:itemId,location,quantity,unit,counted_by:actor,counted_at:new Date().toISOString()});
      s.revision++;return this.persist(m,s,actor);
    });
  }
  async transition(org: string,id: string,actor: string,revision: number,action: "review"|"approve"|"post"|"reopen",reason: string,allowPartial=false) {
    return this.db.transaction(async m => {
      // Retry of a successful post is idempotent even with its old revision.
      const s=await this.owned(m,org,id,undefined,true); if(action==="post"&&s.status==="posted") return s;
      if(s.revision!==revision) throw new DraftKitError(409,"Stocktake changed; reopen it");
      if(action==="reopen") {
        if(s.status!=="reviewed"&&s.status!=="approved") throw new DraftKitError(409,"Only unposted reviews can reopen");
        s.status="draft";s.reviewed_by=null;s.approved_by=null;s.review_reason="";
        s.entries=s.entries.map(e=>({id:e.id,item_id:e.item_id,location:e.location,quantity:e.quantity,unit:e.unit,counted_by:e.counted_by,counted_at:e.counted_at}));
      } else if(action==="review") {
        if(s.status!=="draft"||!s.entries.length) throw new DraftKitError(409,"Review requires a draft with counts");
        const missing=s.targets.reduce((n,t)=>n+t.locations.filter(l=>!s.entries.some(e=>e.item_id===t.item_id&&e.location===l)).length,0);
        if(missing&&!allowPartial) throw new DraftKitError(400,"Missing counts: explicitly review a partial stocktake");
        await this.validateTargets(m,org,s.targets);
        const conversions=await m.findBy(UomConversion,{organization_id:org,is_active:true});
        for(const e of s.entries) {
          const item=await m.findOneByOrFail(InventoryItem,{id:e.item_id,organization_id:org});
          let canonical=stockText(stockUnits(e.quantity));
          if(e.unit!==item.unit) {
            const matches=conversions.filter(c=>c.from_uom===e.unit&&c.to_uom===item.unit&&(!c.item_id||c.item_id===item.id));
            const specific=matches.filter(c=>c.item_id===item.id); const selected=specific.length?specific:matches;
            if(selected.length!==1) throw new DraftKitError(400,"Missing or ambiguous explicit stock unit conversion");
            try {canonical=convertStock(e.quantity,String(selected[0].conversion_factor));}catch(error){throw new DraftKitError(400,(error as Error).message);}
            e.conversion_id=selected[0].id;e.conversion_factor=String(selected[0].conversion_factor);
          }
          const b=await locationBalance(m,org,e.item_id,e.location);
          if(b.unit&&b.unit!==item.unit) throw new DraftKitError(409,"Ledger unit does not match inventory unit");
          e.canonical_quantity=canonical;e.canonical_unit=item.unit;e.baseline=b.quantity;e.sequence=b.sequence;e.reviewed_by=actor;
        }
        s.status="reviewed";s.reviewed_by=actor;s.review_reason=reason;
      } else if(action==="approve") {
        if(s.status!=="reviewed") throw new DraftKitError(409,"Review counts before approval");
        s.status="approved";s.approved_by=actor;for(const e of s.entries)e.approved_by=actor;
      } else {
        if(s.status!=="approved") throw new DraftKitError(409,"Authorized approval required before posting");
        // Sorted item locks serialize competing sessions across every location.
        for(const itemId of [...new Set(s.entries.map(e=>e.item_id))].sort()) {
          const item=await m.findOne(InventoryItem,{where:{id:itemId,organization_id:org},lock:{mode:"pessimistic_write"}});
          if(!item) throw new DraftKitError(400,"Inventory ownership changed");
          const t=s.targets.find(v=>v.item_id===itemId)!;
          await this.validateTargets(m,org,[t]);
          if(!await m.findOneBy(PhysicalStockScope,{organization_id:org,item_id:itemId}))
            await m.insert(PhysicalStockScope,{organization_id:org,item_id:itemId,unit:item.unit,locations:t.locations,complete_coverage:t.complete_coverage,approved_by:s.approved_by!,stocktake_id:s.id});
          for(const e of s.entries.filter(v=>v.item_id===itemId)) {
            if(e.canonical_unit!==item.unit) throw new DraftKitError(409,"Unit changed after review; reopen");
            const b=await locationBalance(m,org,itemId,e.location);
            if(b.sequence!==e.sequence||b.quantity!==e.baseline) throw new DraftKitError(409,"Stock changed after review; reopen and reconcile");
            const delta=stockText(stockUnits(e.canonical_quantity!)-(e.baseline===null?0n:stockUnits(e.baseline!)));
            await m.query(`INSERT INTO stock_ledger (organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type,
              reference_type,reference_id,reason_code,notes,actor_id,actor_name,verified_unit,verification_entry_id,physical_location,physical_sequence,stocktake_id)
              VALUES($1,$2,$3,$4,$5,$6,0,$7,'physical_stocktake',$8,'APPROVED_PHYSICAL_COUNT',$9,$10,$11,$12,$13,$14,$15,$16)`,
              [org,item.id,item.name,item.sku,delta,e.canonical_quantity,e.baseline===null?"INITIAL_BALANCE":"CYCLE_COUNT_VARIANCE",s.id,s.review_reason,
                actor,actor,e.canonical_unit,e.id,e.location,b.sequence+1,s.id]);
          }
        }
        s.status="posted";s.posted_by=actor;
      }
      s.revision++;return this.persist(m,s,actor);
    });
  }
  async history(org: string,id: string) {
    await this.owned(this.db.manager,org,id);
    return this.db.getRepository(StocktakeEvent).find({where:{organization_id:org,stocktake_id:id},order:{revision:"DESC"}});
  }
  async inventory(org: string) {
    return this.db.transaction("REPEATABLE READ",async m=>{
      const items=await m.find(InventoryItem,{where:{organization_id:org},order:{name:"ASC"}});
      const materials: MaterialSummary[]=items.map(i=>({inventory_item_id:i.id,name:i.name,unit:i.unit,gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,incoming:null,immediate_shortage:null,projected_shortage:null}));
      await verifiedAvailability(m,org,materials); await supplyAvailability(m,org,materials);
      const scopes=await m.findBy(PhysicalStockScope,{organization_id:org});
      return items.map(i=>({id:i.id,name:i.name,description:i.description,unit:i.unit,legacy_quantity:String(i.quantity),legacy_status:"unverified",
        ...materials.find(v=>v.inventory_item_id===i.id),scope:scopes.find(s=>s.item_id===i.id)??null}));
    });
  }
  async ledger(org: string,item?: string) {
    return this.db.query(`SELECT * FROM stock_ledger WHERE organization_id=$1 AND verification_entry_id IS NOT NULL
      AND ($2::uuid IS NULL OR item_id=$2) ORDER BY created_at,id`,[org,item??null]);
  }
}
