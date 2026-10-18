import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import { CommitmentLedgerService, planningUnits, type LedgerContext, type LedgerOperation } from "./CommitmentLedgerService";
import type { ReservationDemand } from "./ReservationCommitmentService";
import type { SupplyLine } from "../entity/SupplyPlanning";
import { verifiedAvailability } from "./PhysicalStockService";
import { InventoryItem } from "../entity/InventoryItem";
import type { MaterialSummary } from "../features/projects/planningTypes";

export type PurchaseRequestMutation = ReservationDemand & { id: string; reason: string } & (
  | { transition: "create"; line: string; quantity: string; basis: "manual" | "shortage" }
  | { transition: "adjust"; revision: number; quantity: string }
  | { transition: "review" | "approve" | "cancel"; revision: number }
);
export interface PurchaseRequestResult { id: string; revision: number; status: string; lines: SupplyLine[] }

/** One canonical material line, one school, no implicit reservation reuse or downstream authority.
 * Only the trusted capability executor calls this inside its transaction. */
export async function mutatePurchaseRequest(m: EntityManager, context: LedgerContext, input: PurchaseRequestMutation,
  key: string): Promise<PurchaseRequestResult> {
  if (!input.reason.trim() || input.reason.length > 1000) throw new Error("PR reason required");
  if (!["create","adjust","review","approve","cancel"].includes(input.transition)) throw new Error("Unsupported PR transition");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",
    [context.organization,input.project,input.site,input.demandRevision,input.approval]);
  await m.query("SELECT commitment_reservation_clean($1,$2)",[context.organization,input.project]);
  const item=await m.findOneBy(InventoryItem,{id:input.item,organization_id:context.organization});
  if (!item || item.unit!==input.unit) throw new Error("Explicit canonical inventory unit required; conversion inputs unsupported");
  const [demand]: {cap:string|null;proof:unknown}[]=await m.query(`SELECT sum((l->>'quantity')::numeric)::text cap,
    jsonb_agg(l ORDER BY l::text) proof FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
    WHERE a.id=$1 AND a.organization_id=$2 AND l->>'site_id'=$3 AND l->>'inventory_item_id'=$4 AND l->>'unit'=$5 AND l ? 'material_id'`,
    [input.approval,context.organization,input.site,input.item,input.unit]);
  if (!demand.cap) throw new Error("Exact frozen approved material demand required");
  const ledger=new CommitmentLedgerService(m);
  let [account]:{id:string}[]=await m.query(`SELECT id FROM commitment_accounts WHERE organization_id=$1
    AND project_id=$2 AND site_id=$3 AND dimension='material' AND item_key=$4 AND unit=$5`,
    [context.organization,input.project,input.site,input.item,input.unit]);
  if (!account) account={id:await ledger.createAccount(context,{project:input.project,site:input.site,
    obligation:`material:${input.item}:${input.unit}`,dimension:"material",item:input.item,unit:input.unit,selector:{item:input.item}})};
  let [entitlement]:{id:string}[]=await m.query("SELECT id FROM commitment_entitlements WHERE account_id=$1 AND approval_id=$2",[account.id,input.approval]);
  if (!entitlement) entitlement={id:await ledger.entitlement(context,account.id,input.approval,input.demandRevision,demand.cap,demand.proof)};
  let sequence=0;const prefix=randomUUID();
  const event=(operation:LedgerOperation)=>ledger.executeInTransaction(m,context,account.id,entitlement.id,`${prefix}:${sequence++}`,input.reason,operation);
  const [balance]:{entitlement_id:string|null}[]=await m.query("SELECT entitlement_id FROM commitment_balances WHERE account_id=$1 FOR UPDATE",[account.id]);
  if (balance.entitlement_id!==entitlement.id) await event({kind:"authorize",payload:{}});
  // Same lock order as reservations: project, balance, physical item, operational row.
  await m.query("SELECT id FROM inventory_items WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.item,context.organization]);
  const [existing]:PurchaseRequestResult[]=await m.query("SELECT * FROM purchase_requests WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.id,context.organization]);
  const creating=input.transition==="create";
  if (creating ? Boolean(existing) : !existing || existing.revision!==input.revision || existing.status==="cancelled")
    throw new Error("PR changed, finalized or already exists");
  if (!creating) {
    const bindings=await m.query(`SELECT 1 FROM commitment_pr_lines WHERE request_id=$1 AND organization_id=$2 AND account_id=$3 AND entitlement_id=$4`,
      [input.id,context.organization,account.id,entitlement.id]);
    if (!bindings.length) throw new Error("Historical, foreign or superseded PR requires reconciliation");
    await m.query("SELECT commitment_pr_check($1)",[input.id]);
  }
  const old=existing?.lines[0];
  const previous=old?stockUnits(old.canonical_quantity):0n;
  const next=creating||input.transition==="adjust"?stockUnits(input.quantity):input.transition==="cancel"?0n:previous;
  if ((creating||input.transition==="adjust") && next<=0n) throw new Error("Positive exact stock quantity required");
  if (input.transition==="adjust" && existing.status!=="draft") throw new Error("Only current draft quantity may change");
  if (creating && input.basis!=="manual" && input.basis!=="shortage") throw new Error("Explicit manual or shortage basis required");
  if (creating && input.basis==="shortage") {
    // Stock is evidence for purchase sizing, never an entitlement or a reservation.
    const [availability]=await verifiedAvailability(m,context.organization,[{inventory_item_id:input.item,name:item.name,unit:input.unit,
      gross_demand:0,stock_status:"unverified",verified_on_hand:null,active_reservations:null,available_to_promise:null,
      incoming:null,immediate_shortage:null,projected_shortage:null} satisfies MaterialSummary]);
    if (availability.verified_on_hand===null) throw new Error("Verified physical shortage required");
    const [{approved,held,fulfilled}]:{approved:string;held:string;fulfilled:string}[]=await m.query(
      "SELECT approved::text,held::text,fulfilled::text FROM commitment_balances WHERE account_id=$1",[account.id]);
    const uncovered=(planningUnits(approved)-planningUnits(held)-planningUnits(fulfilled))/100n;
    const physical=stockUnits(String(availability.verified_on_hand));
    const shortage=uncovered-(physical>0n?physical:0n);
    if (shortage<=0n || next>shortage) throw new Error("Requested amount exceeds verified uncovered school shortage");
  }
  const revision=creating?1:existing.revision+1;
  let status=existing?.status??"draft";
  if (input.transition==="review") {if(status!=="draft")throw new Error("Draft required for review");status="reviewed";}
  if (input.transition==="approve") {if(status!=="reviewed")throw new Error("Reviewed PR required for approval");status="approved";}
  if (input.transition==="cancel") status="cancelled";
  const line:SupplyLine=old?{...old,quantity:stockText(next||previous),canonical_quantity:stockText(next||previous)}:{
    id:input.transition==="create"?input.line:"",item_id:input.item,quantity:stockText(next),unit:input.unit,
    canonical_quantity:stockText(next),canonical_unit:input.unit,project_id:input.project,site_id:input.site,
    demand_revision:input.demandRevision,requirement_approval_id:input.approval,qc_required:true,notes:input.reason};
  if (creating) {
    await m.query(`INSERT INTO purchase_requests(id,organization_id,pr_number,created_by,lines,notes)
      VALUES($1,$2,$3,$4,$5::jsonb,$6)`,[input.id,context.organization,`PR-${input.id}`,context.actor,JSON.stringify([line]),input.reason]);
    await m.query(`INSERT INTO commitment_pr_lines(line_id,request_id,organization_id,account_id,entitlement_id,frozen_line,operation_key)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)`,[line.id,input.id,context.organization,account.id,entitlement.id,JSON.stringify(line),key]);
  } else await m.query(`UPDATE purchase_requests SET lines=$3::jsonb,status=$4,revision=$5,
      reviewed_by=CASE WHEN $6='review' THEN $7::uuid ELSE reviewed_by END,
      approved_by=CASE WHEN $6='approve' THEN $7::uuid ELSE approved_by END,updated_at=clock_timestamp()
      WHERE id=$1 AND organization_id=$2`,[input.id,context.organization,JSON.stringify([line]),status,revision,input.transition,context.actor]);
  if (next>previous) await event({kind:"open",payload:{claim:randomUUID(),quantity:stockText(next-previous),
    source:{kind:"purchase_request_line",id:line.id,slice:String(revision)}}});
  else if (next<previous) {
    let remainder=previous-next;
    const claims:{id:string;held:string}[]=await m.query(`SELECT id,held::text FROM commitment_claims WHERE organization_id=$1
      AND account_id=$2 AND source_kind='purchase_request_line' AND source_id=$3 AND held>0 ORDER BY id FOR UPDATE`,[context.organization,account.id,line.id]);
    for (const claim of claims) {
      const q=stockUnits(claim.held)<remainder?stockUnits(claim.held):remainder;
      if(q)await event({kind:"release",payload:{claim:claim.id,quantity:stockText(q),untouched:true,unencumbered:true,
        evidence:`D2B1 clean exclusive PR ${input.id}, revision ${revision}`}});
      remainder-=q;
    }
    if(remainder)throw new Error("Exclusive untouched PR remainder missing");
  }
  const [saved]:PurchaseRequestResult[]=await m.query("SELECT * FROM purchase_requests WHERE id=$1 AND organization_id=$2",[input.id,context.organization]);
  await m.query(`INSERT INTO supply_events(organization_id,kind,record_id,revision,snapshot,actor_id)
    VALUES($1,'request',$2,$3,$4::jsonb,$5)`,[context.organization,input.id,revision,JSON.stringify(saved),context.actor]);
  return saved;
}
