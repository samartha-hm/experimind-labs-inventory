import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { InventoryItem } from "../entity/InventoryItem";
import type { SupplyLine } from "../entity/SupplyPlanning";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import type { LedgerContext } from "./CommitmentLedgerService";
import type { ReservationDemand } from "./ReservationCommitmentService";
import { postVerifiedSupplyMovement } from "./SupplyStockService";

export type ReceiptMutation = ReservationDemand & {
  id: string; order: string; orderRevision: number; line: string; reason: string;
} & (
  | { transition: "receive"; coverage: string; quantity: string; location: string }
  | { transition: "accept" | "reject" | "quarantine"; revision: number }
);
export interface ReceiptResult {
  id: string; po_id: string; status: string; revision: number; quantity: string; ledger_id: string | null;
}

/** Retains existing H; receiving never fulfills demand. All writes share the capability transaction. */
export async function mutateReceipt(m: EntityManager, context: LedgerContext, input: ReceiptMutation,
  key: string): Promise<ReceiptResult> {
  if (!input.reason.trim() || input.reason.length>1000) throw new Error("Receipt/QC reason required");
  if (!["receive","accept","reject","quarantine"].includes(input.transition)) throw new Error("Unsupported receipt transition");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",
    [context.organization,input.project,input.site,input.demandRevision,input.approval]);
  await m.query("SELECT commitment_reservation_clean($1,$2)",[context.organization,input.project]);
  const [binding]:{account_id:string;request_id:string}[]=await m.query(`SELECT b.account_id,b.request_id
    FROM commitment_po_lines b JOIN commitment_accounts a ON a.id=b.account_id
    JOIN commitment_entitlements e ON e.id=b.entitlement_id WHERE b.order_id=$1 AND b.line_id=$2
    AND b.organization_id=$3 AND a.organization_id=$3 AND a.project_id=$4 AND a.site_id=$5
    AND a.item_key=$6 AND a.unit=$7 AND a.dimension='material' AND e.approval_id=$8 AND e.revision=$9`,
    [input.order,input.line,context.organization,input.project,input.site,input.item,input.unit,input.approval,input.demandRevision]);
  if (!binding) throw new Error("Exact current integrated PO lineage required");
  // Same project/account/item/PR/PO/claim ordering as the upstream writers.
  await m.query("SELECT account_id FROM commitment_balances WHERE account_id=$1 FOR UPDATE",[binding.account_id]);
  await m.query("SELECT id FROM inventory_items WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.item,context.organization]);
  await m.query("SELECT id FROM purchase_requests WHERE id=$1 FOR UPDATE",[binding.request_id]);
  const [po]:{planning_revision:number;status:string;planning_lines:SupplyLine[]}[]=await m.query(
    "SELECT * FROM purchase_orders WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.order,context.organization]);
  if (!po || po.status!=="approved" || po.planning_revision!==input.orderRevision) throw new Error("Current approved PO revision required");
  await m.query("SELECT commitment_po_check($1)",[input.order]);
  const line=po.planning_lines[0];
  if (input.transition==="receive") {
    const quantity=stockText(stockUnits(input.quantity));
    if (stockUnits(quantity)<=0n || !input.location.trim() || input.location.length>100) throw new Error("Positive exact receipt and location required");
    const [coverage]:{start_quantity:string;end_quantity:string}[]=await m.query(`SELECT trim_scale(start_quantity)::text start_quantity,trim_scale(end_quantity)::text end_quantity
      FROM commitment_po_coverage WHERE id=$1 AND order_id=$2 FOR UPDATE`,[input.coverage,input.order]);
    if (!coverage) throw new Error("Explicit owned PO coverage required");
    const [{used}]:{used:string}[]=await m.query(`SELECT trim_scale(coalesce(max(end_quantity),$2::numeric))::text used
      FROM commitment_receipts WHERE coverage_id=$1`,[input.coverage,coverage.start_quantity]);
    const start=stockUnits(stockText(stockUnits(used))),end=start+stockUnits(quantity);
    if (end>stockUnits(stockText(stockUnits(coverage.end_quantity)))) throw new Error("Outstanding PO coverage exhausted");
    const source={quantity,unit:line.canonical_unit,po_line:line};
    await m.query(`INSERT INTO purchase_goods_receipts(id,organization_id,po_id,line_id,item_id,quantity,unit,location,source,received_by,reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11)`,
      [input.id,context.organization,input.order,input.line,input.item,quantity,line.canonical_unit,input.location,JSON.stringify(source),context.actor,input.reason]);
    await m.query(`INSERT INTO commitment_receipts(receipt_id,coverage_id,order_revision,frozen_order,start_quantity,end_quantity)
      SELECT $1,$2,$3,to_jsonb(p),$4,$5 FROM purchase_orders p WHERE id=$6`,
      [input.id,input.coverage,input.orderRevision,stockText(start),stockText(end),input.order]);
  } else {
    const [receipt]:{revision:number;status:string;location:string;quantity:string}[]=await m.query(`SELECT g.* FROM purchase_goods_receipts g
      JOIN commitment_receipts b ON b.receipt_id=g.id WHERE g.id=$1 AND g.po_id=$2 AND g.line_id=$3
      AND g.organization_id=$4 FOR UPDATE OF g`,[input.id,input.order,input.line,context.organization]);
    if (!receipt || receipt.revision!==input.revision || !["pending","quarantined"].includes(receipt.status)
      || input.transition==="quarantine" && receipt.status==="quarantined") throw new Error("Receipt changed or finalized");
    const ledgerId=input.transition==="accept"?randomUUID():null;
    await m.query(`UPDATE purchase_goods_receipts SET status=$2,revision=revision+1,inspected_by=$3,reason=$4,ledger_id=$5 WHERE id=$1`,
      [input.id,{accept:"accepted",reject:"rejected",quarantine:"quarantined"}[input.transition],context.actor,input.reason,ledgerId]);
    if (ledgerId) {
      const item=await m.findOneByOrFail(InventoryItem,{id:input.item,organization_id:context.organization});
      const acceptedQuantity=stockUnits(stockText(stockUnits(receipt.quantity)));
      await postVerifiedSupplyMovement(m,context.organization,item,receipt.location,acceptedQuantity,context.actor,{receipt:input.id,ledger_id:ledgerId});
    }
  }
  // SQL JSON snapshots avoid driver timestamp/decimal normalization differences in reciprocal witnesses.
  const [{result}]:{result:ReceiptResult}[]=await m.query("SELECT to_jsonb(g) result FROM purchase_goods_receipts g WHERE id=$1",[input.id]);
  await m.query(`INSERT INTO commitment_receipt_decisions(receipt_id,revision,organization_id,actor_id,operation_key,snapshot)
    VALUES($1,$2,$3,$4,$5,$6::jsonb)`,[input.id,result.revision,context.organization,context.actor,key,JSON.stringify(result)]);
  await m.query(`INSERT INTO supply_events(organization_id,kind,record_id,revision,actor_id,snapshot)
    VALUES($1,'receipt',$2,$3,$4,$5::jsonb)`,[context.organization,input.id,result.revision,context.actor,JSON.stringify(result)]);
  return result;
}
