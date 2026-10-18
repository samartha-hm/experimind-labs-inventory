import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import { CommitmentLedgerService, type LedgerContext, type LedgerOperation } from "./CommitmentLedgerService";

export interface ReservationDemand {
  project: string; site: string; item: string; unit: string; approval: string; demandRevision: number;
}
export type ReservationMutation = ReservationDemand & { id: string; reason: string } & (
  | { transition: "create"; quantity: string }
  | { transition: "adjust"; revision: number; quantity: string }
  | { transition: "release" | "cancel" | "fulfill"; revision: number }
);
export interface ReservationResult { id: string; revision: number; status: string; quantity: string }

/** Internal adapter: called only inside the capability executor's transaction.
 * Activation requires the isolated D2 schema and separately provisioned writer ACLs.
 */
export async function mutateReservation(m: EntityManager, context: LedgerContext, input: ReservationMutation,
  key: string): Promise<ReservationResult> {
  if (!input.reason.trim() || input.reason.length > 1000) throw new Error("Reservation reason required");
  if (input.transition === "fulfill") throw new Error("Fulfillment blocked: downstream exclusive consumption lineage is not integrated");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",
    [context.organization,input.project,input.site,input.demandRevision,input.approval]);
  // Project lock precedes balance/source, item and reservation locks. The gate also
  // serializes all unintegrated root writers on this project before testing lineage.
  await m.query("SELECT commitment_reservation_clean($1,$2)",[context.organization,input.project]);
  const [item]: { unit: string }[] = await m.query("SELECT unit FROM inventory_items WHERE id=$1 AND organization_id=$2",
    [input.item,context.organization]);
  if (!item || item.unit !== input.unit) throw new Error("Exact canonical inventory unit required; conversions must be frozen upstream");
  const [demand]: { cap: string | null; proof: unknown }[] = await m.query(`SELECT sum((l->>'quantity')::numeric)::text cap,
    jsonb_agg(l ORDER BY l::text) proof FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
    WHERE a.id=$1 AND a.organization_id=$2 AND l->>'site_id'=$3 AND l->>'inventory_item_id'=$4
      AND l->>'unit'=$5 AND l ? 'material_id'`,[input.approval,context.organization,input.site,input.item,input.unit]);
  if (!demand.cap) throw new Error("Frozen approved material demand required");
  const ledger = new CommitmentLedgerService(m);
  let [account]: { id: string }[] = await m.query(`SELECT id FROM commitment_accounts WHERE organization_id=$1
    AND project_id=$2 AND site_id=$3 AND dimension='material' AND item_key=$4 AND unit=$5`,
    [context.organization,input.project,input.site,input.item,input.unit]);
  if (!account) account = { id: await ledger.createAccount(context,{project:input.project,site:input.site,
    obligation:`material:${input.item}:${input.unit}`,dimension:"material",item:input.item,unit:input.unit,selector:{item:input.item}}) };
  let [entitlement]: { id: string }[] = await m.query("SELECT id FROM commitment_entitlements WHERE account_id=$1 AND approval_id=$2",
    [account.id,input.approval]);
  if (!entitlement) entitlement = { id: await ledger.entitlement(context,account.id,input.approval,input.demandRevision,demand.cap,demand.proof) };
  let sequence = 0;
  // Event keys do not depend on truncating an externally supplied operation key.
  const eventPrefix = randomUUID();
  const event = (operation: LedgerOperation) => ledger.executeInTransaction(m,context,account.id,entitlement.id,
    `${eventPrefix}:${sequence++}`,input.reason,operation);
  const [balance]: { entitlement_id: string | null }[] = await m.query(
    "SELECT entitlement_id FROM commitment_balances WHERE account_id=$1 FOR UPDATE",[account.id]);
  if (balance.entitlement_id !== entitlement.id) await event({kind:"authorize",payload:{}});
  await m.query("SELECT id FROM inventory_items WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.item,context.organization]);
  const [existing]: (ReservationResult & { project_id:string; site_id:string; item_id:string; unit:string })[] =
    await m.query("SELECT * FROM project_stock_reservations WHERE id=$1 AND organization_id=$2 FOR UPDATE",[input.id,context.organization]);
  const creating = input.transition === "create";
  if (creating ? Boolean(existing) : !existing || existing.status !== "active" || existing.revision !== input.revision)
    throw new Error("Reservation changed, finalized or already exists");
  if (existing && (existing.project_id!==input.project || existing.site_id!==input.site || existing.item_id!==input.item || existing.unit!==input.unit))
    throw new Error("Reservation demand identity mismatch");
  if (!creating && !(await m.query(`SELECT 1 FROM commitment_reservations WHERE reservation_id=$1 AND organization_id=$2
    AND account_id=$3 AND entitlement_id=$4`,[input.id,context.organization,account.id,entitlement.id])).length)
    throw new Error("Historical or superseded reservation requires reconciliation");
  const previous = existing ? stockUnits(existing.quantity) : 0n;
  const next = input.transition === "create" || input.transition === "adjust" ? stockUnits(input.quantity) : 0n;
  if ((creating || input.transition === "adjust") && next <= 0n) throw new Error("Positive exact stock quantity required");
  const revision = creating ? 1 : existing.revision + 1;
  if (creating) {
    await m.query(`INSERT INTO project_stock_reservations(id,organization_id,project_id,site_id,item_id,quantity,unit,created_by,updated_by,reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$8,$9)`,[input.id,context.organization,input.project,input.site,input.item,stockText(next),input.unit,context.actor,input.reason]);
    await m.query(`INSERT INTO commitment_reservations(reservation_id,organization_id,account_id,entitlement_id,operation_key)
      VALUES($1,$2,$3,$4,$5)`,[input.id,context.organization,account.id,entitlement.id,key]);
  } else {
    await m.query(`UPDATE project_stock_reservations SET quantity=$3,status=$4,revision=$5,updated_by=$6,reason=$7,updated_at=clock_timestamp()
      WHERE id=$1 AND organization_id=$2`,[input.id,context.organization,stockText(next || previous),
      input.transition === "release" ? "released" : input.transition === "cancel" ? "cancelled" : "active",revision,context.actor,input.reason]);
  }
  if (next > previous) await event({kind:"open",payload:{claim:randomUUID(),quantity:stockText(next-previous),
    source:{kind:"project_reservation",id:input.id,slice:String(revision)}}});
  else if (next < previous) {
    let remainder = previous-next;
    const claims: {id:string; held:string}[] = await m.query(`SELECT id,held::text FROM commitment_claims
      WHERE organization_id=$1 AND account_id=$2 AND source_kind='project_reservation' AND source_id=$3 AND held>0 ORDER BY id FOR UPDATE`,
      [context.organization,account.id,input.id]);
    for (const claim of claims) {
      const held=stockUnits(claim.held), q=held<remainder?held:remainder;
      if (q) await event({kind:"release",payload:{claim:claim.id,quantity:stockText(q),untouched:true,unencumbered:true,
        evidence:`D2 isolated lineage gate; reservation ${input.id}; revision ${revision}`}});
      remainder-=q;
    }
    if (remainder) throw new Error("Exclusive untouched commitment remainder missing");
  }
  const [saved]: ReservationResult[] = await m.query("SELECT * FROM project_stock_reservations WHERE id=$1 AND organization_id=$2",[input.id,context.organization]);
  await m.query(`INSERT INTO supply_events(organization_id,kind,record_id,revision,snapshot,actor_id)
    VALUES($1,'reservation',$2,$3,$4::jsonb,$5)`,[context.organization,input.id,revision,JSON.stringify(saved),context.actor]);
  return saved;
}
