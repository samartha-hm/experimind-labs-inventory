import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import type { LedgerContext } from "./CommitmentLedgerService";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";

export interface FinishedOutputInput {
  order: string;
  source: string;
  quantity: string;
  unit: string;
  location: string;
}
export interface FinishedOutputResult { id: string; order: string; quantity: string; qr: string }

/** The database derives immutable input evidence under the same work-order lock as issue. */
export async function recordFinishedOutput(
  manager: EntityManager, context: LedgerContext, input: FinishedOutputInput, key: string,
): Promise<FinishedOutputResult> {
  const fields = ["order", "source", "quantity", "unit", "location"];
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!input || Object.keys(input).length !== fields.length || Object.keys(input).some(k => !fields.includes(k)) ||
      !uuid.test(input.order) || !uuid.test(input.source) || typeof input.location !== "string" ||
      !input.location.trim() || input.location.length > 100 || typeof input.unit !== "string")
    throw Error("Exact finished-output identity, quantity, unit and location required");
  const quantity = stockText(stockUnits(input.quantity));
  if (!stockUnits(quantity)) throw Error("Positive finished output required");
  const [scope] = await manager.query(`SELECT w.project_id,w.site_id,w.demand_revision,c.approval_id
    FROM production_work_orders w JOIN commitment_work_orders c ON c.order_id=w.id
    WHERE w.id=$1 AND w.organization_id=$2`, [input.order, context.organization]);
  if (!scope) throw Error("Owned trusted work order required");
  await manager.query("SELECT requirement_assert($1,$2,$3,$4,$5)",
    [context.organization, scope.project_id, scope.site_id, scope.demand_revision, scope.approval_id]);
  const id = randomUUID();
  const result = { id, order: input.order, quantity, qr: `ERP:OUTPUT:${id}` };
  await manager.query(`INSERT INTO production_output_custody
    (id,organization_id,order_id,source_id,quantity,unit,location,actor_id,operation_key,qr)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [id, context.organization, input.order, input.source, quantity, input.unit, input.location.trim(), context.actor, key, result.qr]);
  await manager.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after")
    VALUES($1,$2,$3,'FINISHED_OUTPUT','trusted_production',$4,$5::jsonb)`,
  [randomUUID(), context.organization, context.actor, id, JSON.stringify(result)]);
  return result;
}
