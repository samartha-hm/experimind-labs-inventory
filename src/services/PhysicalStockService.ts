import { EntityManager, In } from "typeorm";
import { PhysicalStockScope } from "../entity/Stocktake";
import type { MaterialSummary } from "../features/projects/planningTypes";
import { decimalNumber, decimalUnits } from "../features/projects/requirementPlanning";
import { stockUnits, stockText } from "../features/inventory/physicalQuantity";

export interface LocationBalance { quantity: string | null; sequence: number; unit: string | null }
export async function locationBalance(m: EntityManager, org: string, item: string, location: string): Promise<LocationBalance> {
  const rows: { quantity: string | null; sequence: number; units: string[] | null }[] = await m.query(
    `SELECT SUM(qty_delta)::text AS quantity, COALESCE(MAX(physical_sequence),0)::int AS sequence,
      array_agg(DISTINCT verified_unit) AS units FROM stock_ledger
      WHERE organization_id=$1 AND item_id=$2 AND physical_location=$3 AND verification_entry_id IS NOT NULL`,[org,item,location]);
  const row = rows[0];
  if (row.units && (row.units.length !== 1 || row.units[0] === null)) throw new Error("Ledger unit reconciliation failed");
  return { quantity: row.quantity === null ? null : stockText(stockUnits(row.quantity)), sequence: row.sequence, unit: row.units?.[0] ?? null };
}
export async function verifiedAvailability(m: EntityManager, org: string, materials: MaterialSummary[]) {
  const ids = [...new Set(materials.map(v => v.inventory_item_id))];
  const scopes = ids.length ? await m.findBy(PhysicalStockScope,{ organization_id: org, item_id: In(ids) }) : [];
  for (const material of materials) {
    const scope = scopes.find(s => s.item_id === material.inventory_item_id);
    if (!scope || scope.unit !== material.unit) continue;
    // Coverage is an approved attestation, never an inferred legacy location list.
    // Later posted counts can attest complete coverage without rewriting the original scope.
    const attestations: { complete: boolean }[] = await m.query(
      `SELECT (t->>'complete_coverage')::boolean AS complete FROM physical_stocktakes s,
       jsonb_array_elements(s.targets) t WHERE s.organization_id=$1 AND s.status='posted'
       AND t->>'item_id'=$2 ORDER BY s.updated_at DESC, s.id DESC LIMIT 1`,[org,scope.item_id]);
    if (!attestations[0]?.complete) continue;
    const balances = await Promise.all(scope.locations.map(l => locationBalance(m,org,scope.item_id,l)));
    if (balances.some(b => b.quantity === null || b.unit !== scope.unit)) continue;
    const sum = balances.reduce((n,b) => n + stockUnits(b.quantity!),0n);
    const onHand = decimalNumber(sum*100n);
    material.stock_status = "verified"; material.verified_on_hand = onHand;
    // These modules are disabled; no supported reservations can consume verified stock.
    material.available_to_promise = onHand;
    material.immediate_shortage = decimalNumber(decimalUnits(material.gross_demand) > sum*100n ? decimalUnits(material.gross_demand)-sum*100n : 0n);
  }
  return materials;
}
