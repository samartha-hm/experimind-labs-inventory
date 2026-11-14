import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import { planningStock, type LedgerContext } from "./CommitmentLedgerService";
import type { ReservationDemand } from "./ReservationCommitmentService";
import type { SupplyLine } from "../entity/SupplyPlanning";

export interface PurchaseOrderSlice { claim: string; slice: string; quantity: string }
export type PurchaseOrderMutation = ReservationDemand & { id: string; request: string; requestRevision: number; line: string; reason: string } & (
  | { transition: "create"; vendor: string; sources: PurchaseOrderSlice[] }
  | { transition: "increase"; revision: number; sources: PurchaseOrderSlice[] }
  | { transition: "review" | "approve" | "decrease" | "cancel"; revision: number }
);
export interface PurchaseOrderResult {
  id: string; planning_revision: number; status: string; planning_lines: SupplyLine[];
  reviewed_by: string | null; approved_by: string | null;
}

/** Claims existing PR H exclusively. Coverage is a stage allocation, never a second ledger hold. */
export async function mutatePurchaseOrder(m: EntityManager, context: LedgerContext, input: PurchaseOrderMutation,
  key: string): Promise<PurchaseOrderResult> {
  if (!input.reason.trim() || input.reason.length>1000) throw new Error("PO reason required");
  if (input.transition==="cancel" || input.transition==="decrease")
    throw new Error("PO settlement proof unavailable; decrease/cancel/return-to-PR blocked");
  if (!["create","increase","review","approve"].includes(input.transition)) throw new Error("Unsupported PO transition");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",
    [context.organization,input.project,input.site,input.demandRevision,input.approval]);
  await m.query("SELECT commitment_reservation_clean($1,$2)",[context.organization,input.project]);
  const [binding]:{account_id:string;entitlement_id:string}[]=await m.query(`SELECT b.account_id,b.entitlement_id
    FROM commitment_pr_lines b JOIN commitment_accounts a ON a.id=b.account_id
    JOIN commitment_entitlements e ON e.id=b.entitlement_id WHERE b.request_id=$1 AND b.line_id=$2
    AND b.organization_id=$3 AND a.organization_id=$3 AND a.project_id=$4 AND a.site_id=$5
    AND a.dimension='material' AND a.item_key=$6 AND a.unit=$7 AND e.approval_id=$8 AND e.revision=$9`,
    [input.request,input.line,context.organization,input.project,input.site,input.item,input.unit,input.approval,input.demandRevision]);
  if (!binding) throw new Error("Exact current integrated PR lineage required");
  // Project -> account -> physical item -> PR -> PO -> claims, consistently with PR/reservation writers.
  await m.query("SELECT account_id FROM commitment_balances WHERE account_id=$1 FOR UPDATE",[binding.account_id]);
  await m.query("SELECT id FROM inventory_items WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.item,context.organization]);
  const [pr]:{revision:number;status:string;lines:SupplyLine[]}[]=await m.query(
    "SELECT * FROM purchase_requests WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.request,context.organization]);
  if (!pr || pr.revision!==input.requestRevision || pr.status!=="approved") throw new Error("Current approved PR revision required");
  await m.query("SELECT commitment_pr_check($1)",[input.request]);
  const [existing]:PurchaseOrderResult[]=await m.query("SELECT * FROM purchase_orders WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.id,context.organization]);
  const creating=input.transition==="create";
  if (creating ? Boolean(existing) : !existing || existing.planning_revision!==input.revision || existing.status!=="draft")
    throw new Error("PO changed, finalized or already exists");
  if (!creating) {
    if (!(await m.query(`SELECT 1 FROM commitment_po_lines WHERE order_id=$1 AND request_id=$2 AND line_id=$3
      AND organization_id=$4 AND account_id=$5 AND entitlement_id=$6`,
      [input.id,input.request,input.line,context.organization,binding.account_id,binding.entitlement_id])).length)
      throw new Error("Historical or mismatched PO lineage requires reconciliation");
    await m.query("SELECT commitment_po_check($1)",[input.id]);
  }
  if (input.transition==="increase" && existing.reviewed_by) throw new Error("Reviewed PO cannot be amended");
  if (input.transition==="review" && existing.reviewed_by) throw new Error("PO already reviewed");
  if (input.transition==="approve" && !existing.reviewed_by) throw new Error("Reviewed PO required");
  let quantity=creating?0n:stockUnits(existing.planning_lines[0].canonical_quantity);
  const allocations:{claim:string;slice:string;start:string;end:string}[]=[];
  if (creating || input.transition==="increase") {
    if (!Array.isArray(input.sources) || !input.sources.length || input.sources.length>100 ||
      new Set(input.sources.map(s=>s.claim)).size!==input.sources.length) throw new Error("Distinct explicit PR source slices required");
    for (const source of [...input.sources].sort((a,b)=>a.claim.localeCompare(b.claim))) {
      const q=stockUnits(source.quantity);
      if (q<=0n) throw new Error("Positive exact source quantity required");
      const [claim]:{held:string}[]=await m.query(`SELECT held::text FROM commitment_claims c WHERE id=$1
        AND organization_id=$2 AND account_id=$3 AND source_kind='purchase_request_line' AND source_id=$4
        AND source_slice=$5 AND NOT retired AND parent_id IS NULL AND fulfilled=0 FOR UPDATE`,
        [source.claim,context.organization,binding.account_id,input.line,source.slice]);
      if (!claim) throw new Error("Exact live PR source slice required");
      const [{used}]:{used:string}[]=await m.query("SELECT coalesce(max(end_quantity),0)::text used FROM commitment_po_coverage WHERE claim_id=$1",[source.claim]);
      const start=stockUnits(planningStock(used)),end=start+q;
      if (end>stockUnits(planningStock(claim.held))) throw new Error("PR slice coverage exhausted");
      allocations.push({claim:source.claim,slice:source.slice,start:stockText(start),end:stockText(end)});
      quantity+=q;
    }
  }
  const line:SupplyLine={...pr.lines[0],quantity:stockText(quantity),canonical_quantity:stockText(quantity)};
  const revision=creating?1:existing.planning_revision+1;
  if (creating) {
    if (!(await m.query("SELECT id FROM vendors WHERE id=$1 AND organization_id=$2",[input.vendor,context.organization])).length)
      throw new Error("Tenant supplier required");
    await m.query(`INSERT INTO purchase_orders(id,organization_id,purchase_request_id,vendor_id,po_number,order_date,
      status,total_amount,planning_revision,planning_lines,created_by) VALUES($1,$2,$3,$4,$5,CURRENT_DATE,'draft',0,1,$6::jsonb,$7)`,
      [input.id,context.organization,input.request,input.vendor,`PO-${input.id}`,JSON.stringify([line]),context.actor]);
    await m.query(`INSERT INTO commitment_po_lines(order_id,request_id,line_id,organization_id,account_id,entitlement_id,
      request_revision,frozen_request,frozen_order,operation_key) SELECT p.id,r.id,$3,$4,$5,$6,$7,to_jsonb(r),to_jsonb(p),$8
      FROM purchase_orders p,purchase_requests r WHERE p.id=$1 AND r.id=$2`,
      [input.id,input.request,input.line,context.organization,binding.account_id,binding.entitlement_id,input.requestRevision,key]);
  } else await m.query(`UPDATE purchase_orders SET planning_lines=$3::jsonb,planning_revision=$4,
    reviewed_by=CASE WHEN $5='review' THEN $6::uuid ELSE reviewed_by END,
    approved_by=CASE WHEN $5='approve' THEN $6::uuid ELSE approved_by END,
    status=CASE WHEN $5='approve' THEN 'approved' ELSE status END,updated_at=clock_timestamp()
    WHERE id=$1 AND organization_id=$2`,[input.id,context.organization,JSON.stringify([line]),revision,input.transition,context.actor]);
  for (const a of allocations) await m.query(`INSERT INTO commitment_po_coverage(id,order_id,claim_id,source_slice,start_quantity,end_quantity,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[randomUUID(),input.id,a.claim,a.slice,a.start,a.end,key]);
  const [saved]:PurchaseOrderResult[]=await m.query("SELECT * FROM purchase_orders WHERE id=$1 AND organization_id=$2",[input.id,context.organization]);
  await m.query(`INSERT INTO supply_events(organization_id,kind,record_id,revision,snapshot,actor_id)
    VALUES($1,'order',$2,$3,$4::jsonb,$5)`,[context.organization,input.id,revision,JSON.stringify(saved),context.actor]);
  return saved;
}
