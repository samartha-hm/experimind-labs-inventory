import { EntityManager } from "typeorm";
import { randomUUID } from "node:crypto";
import { InventoryItem } from "../entity/InventoryItem";
import { PhysicalStockScope } from "../entity/Stocktake";
import { DraftKitError } from "./ProductTemplateService";
import { locationBalance } from "./PhysicalStockService";
import { stockUnits, stockText } from "../features/inventory/physicalQuantity";
import { decimalNumber, decimalUnits } from "../features/projects/requirementPlanning";
import type { MaterialSummary } from "../features/projects/planningTypes";

export async function reservationTotals(m:EntityManager,org:string,item:string,project?:string,unit?:string) {
  const rows:{total:string;own:string;fulfilled:string}[]=await m.query(`SELECT
    COALESCE(SUM(quantity) FILTER(WHERE status='active'),0)::text total,
    COALESCE(SUM(quantity) FILTER(WHERE status='active' AND project_id=$3),0)::text own,
    COALESCE(SUM(quantity) FILTER(WHERE status='fulfilled' AND project_id=$3),0)::text fulfilled
    FROM project_stock_reservations WHERE organization_id=$1 AND item_id=$2 AND ($4::text IS NULL OR unit=$4)`,[org,item,project??null,unit??null]);
  return {total:stockUnits(rows[0].total),own:stockUnits(rows[0].own),fulfilled:stockUnits(rows[0].fulfilled)};
}
export async function supplyAvailability(m:EntityManager,org:string,materials:MaterialSummary[],project?:string) {
  for(const v of materials) {
    const r=await reservationTotals(m,org,v.inventory_item_id,project,v.unit);
    v.active_reservations=decimalNumber(r.total*100n);v.project_reservations=decimalNumber(r.own*100n);v.fulfilled_quantity=decimalNumber(r.fulfilled*100n);
    const orders:{id:string;planning_lines:import("../entity/SupplyPlanning").SupplyLine[]}[]=await m.query(`SELECT id,planning_lines FROM purchase_orders WHERE organization_id=$1 AND planning_revision IS NOT NULL AND approved_by IS NOT NULL AND status='approved'`,[org]);
    let incoming=0n,ownIncoming=0n;
    for(const o of orders)for(const l of o.planning_lines)if(l.item_id===v.inventory_item_id&&l.canonical_unit===v.unit) {
      // Every delivery, including rejection, consumes its authorized delivery allowance. Replacements need a new approved PO.
      const delivered:{q:string;pending:string}[]=await m.query(`SELECT COALESCE(SUM(quantity),0)::text q,
        COALESCE(SUM(quantity) FILTER(WHERE status IN ('pending','quarantined')),0)::text pending
        FROM purchase_goods_receipts WHERE organization_id=$1 AND po_id=$2 AND line_id=$3`,[org,o.id,l.id]);
      const remaining=stockUnits(l.canonical_quantity)-stockUnits(delivered[0].q)+stockUnits(delivered[0].pending);
      incoming+=remaining;if(l.project_id===project)ownIncoming+=remaining;
    }
    v.incoming=decimalNumber(incoming*100n);v.project_incoming=decimalNumber(ownIncoming*100n);
    if(v.stock_status!=="verified"||v.verified_on_hand===null)continue;
    const onhand=decimalUnits(v.verified_on_hand);const free=onhand-r.total*100n;
    if(free<0n)throw new Error("Reservation/ledger reconciliation failed");
    v.available_to_promise=decimalNumber(free);
    const uncovered=decimalUnits(v.gross_demand)-free-(r.own+r.fulfilled)*100n;
    v.immediate_shortage=decimalNumber(uncovered>0n?uncovered:0n);
    const future=uncovered-ownIncoming*100n;
    v.projected_shortage=decimalNumber(future>0n?future:0n);
  }
}
/** Same physical ledger and item lock as stocktakes. Never writes legacy balances. Caller stores provenance atomically. */
export async function postVerifiedSupplyMovement(m:EntityManager,org:string,item:InventoryItem,location:string,quantity:bigint,actor:string,source:{receipt?:string;reservation?:string;ledger_id:string}) {
  const scope=await m.findOneBy(PhysicalStockScope,{organization_id:org,item_id:item.id});
  const b=await locationBalance(m,org,item.id,location);
  if(!scope?.locations.includes(location)||b.quantity===null||b.unit!==item.unit)throw new DraftKitError(409,"Count this declared stock location before posting supply movements");
  const balance=stockUnits(b.quantity)+quantity;if(balance<0n)throw new DraftKitError(409,"Insufficient stock at selected physical location");
  await m.query(`INSERT INTO stock_ledger(id,organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type,reference_type,
    reference_id,reason_code,actor_id,actor_name,verified_unit,verification_entry_id,physical_location,physical_sequence,goods_receipt_id,reservation_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,0,$8,$9,$10::text,$11,$12::uuid,$12::text,$13,$10::uuid,$14,$15,$16,$17)`,
    [source.ledger_id||randomUUID(),org,item.id,item.name,item.sku,stockText(quantity),stockText(balance),source.receipt?"PO_RECEIPT":"SO_SHIPMENT",
      source.receipt?"accepted_goods_receipt":"reservation_fulfillment",source.receipt??source.reservation,source.receipt?"ACCEPTED_RECEIPT":"FULFILLED_RESERVATION",
      actor,item.unit,location,b.sequence+1,source.receipt??null,source.reservation??null]);
}
