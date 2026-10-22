import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import type { RecipeDefinition } from "../entity/ProductionPlanning";
import { recipeMaterialBudget } from "../features/production/recipeMaterialBudget";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import { CommitmentLedgerService, type LedgerContext } from "./CommitmentLedgerService";
import { locationBalance } from "./PhysicalStockService";

export interface WorkOrderClaim {
  project: string; site: string; approval: string; demandRevision: number;
  recipe: string; source: string; quantity: string; unit: string;
}
export interface WorkOrderIssue {
  order: string; material: string; source: string; quantity: string; unit: string; location: string; reason: string;
}
export interface WorkOrderResult { id: string; materials: { id: string; item: string; quantity: string; unit: string }[] }
export interface WorkOrderIssueResult { id: string; order: string; ledger: string; event: string; quantity: string }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function exact(input: object, fields: string[]) {
  if (!input || Object.keys(input).some(k => !fields.includes(k)) || fields.some(k => !(k in input)))
    throw Error("Exact supported production payload required");
}
async function audit(m: EntityManager, c: LedgerContext, id: string, action: string, result: object) {
  await m.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after")
    VALUES($1,$2,$3,$4,'trusted_production',$5,$6::jsonb)`, [randomUUID(), c.organization, c.actor, action, id, JSON.stringify(result)]);
}

/** Called only inside the capability writer's transaction. No runtime SQL authority. */
export async function claimWorkOrder(m: EntityManager, c: LedgerContext, i: WorkOrderClaim, key: string): Promise<WorkOrderResult> {
  exact(i,["project","site","approval","demandRevision","recipe","source","quantity","unit"]);
  if (![i.project,i.site,i.approval,i.recipe,i.source].every(v => uuid.test(v)) || !Number.isInteger(i.demandRevision)) throw Error("Invalid production identity");
  const quantity = stockText(stockUnits(i.quantity)); if (stockUnits(quantity) === 0n) throw Error("Positive output required");
  // requirement_assert locks the project: all planning and production claims serialize before item locks.
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",[c.organization,i.project,i.site,i.demandRevision,i.approval]);
  const [recipe] = await m.query(`SELECT * FROM production_recipes WHERE id=$1 AND organization_id=$2 AND authority_key IS NOT NULL AND status='approved'`,[i.recipe,c.organization]);
  if (!recipe || (await m.query("SELECT 1 FROM production_recipes WHERE organization_id=$1 AND family_id=$2 AND version>$3",[c.organization,recipe.family_id,recipe.version])).length) throw Error("Current published recipe required for new claim");
  const definition = recipe.definition as RecipeDefinition;
  if (definition.unit !== i.unit) throw Error("Canonical output unit required");
  const lines = await m.query(`SELECT l FROM requirement_approvals a,LATERAL jsonb_array_elements(a.snapshot->'lines') l
    WHERE a.id=$1 AND a.organization_id=$2 AND l->>'site_id'=$3 AND l->>'inventory_item_id'=$4 AND l->>'unit'=$5 AND l ? 'material_id'`,[i.approval,c.organization,i.site,definition.output_item_id,i.unit]);
  if (lines.length !== 1) throw Error("One unambiguous approved output demand line required");
  // No transfer is inferred from historical planning reservations, procurement or synthetic claims.
  const ids = [definition.output_item_id,...definition.inputs.map(v=>v.item_id)].sort();
  const items: {id:string;unit:string}[] = await m.query(`SELECT id,unit FROM inventory_items WHERE organization_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE`,[c.organization,ids]);
  if (items.length !== ids.length) throw Error("Owned recipe items required");
  const units=Object.fromEntries(items.map(v=>[v.id,v.unit]));
  const budget=recipeMaterialBudget(definition,quantity,units), ledger=new CommitmentLedgerService(m);
  const id=randomUUID(), outputClaim=randomUUID();
  let [account] = await m.query(`SELECT id FROM commitment_accounts WHERE organization_id=$1 AND project_id=$2 AND site_id=$3 AND dimension='material' AND item_key=$4 AND unit=$5`,[c.organization,i.project,i.site,definition.output_item_id,i.unit]);
  if (account && (await m.query(`SELECT 1 FROM commitment_claims c WHERE c.account_id=$1 AND NOT EXISTS
    (SELECT 1 FROM commitment_work_orders w WHERE w.output_claim=c.id)`,[account.id])).length) throw Error("Existing output ownership needs explicit reconciliation/transfer");
  if (!account) account={id:await ledger.createAccount(c,{project:i.project,site:i.site,obligation:`material:${definition.output_item_id}:${i.unit}`,dimension:"material",item:definition.output_item_id,unit:i.unit,selector:{item:definition.output_item_id}})};
  let [entitlement]=await m.query("SELECT id FROM commitment_entitlements WHERE account_id=$1 AND approval_id=$2",[account.id,i.approval]);
  if (!entitlement) entitlement={id:await ledger.entitlement(c,account.id,i.approval,i.demandRevision,String(lines[0].l.quantity),[lines[0].l])};
  const event=(a:string,e:string,op:Parameters<CommitmentLedgerService["executeInTransaction"]>[6])=>ledger.executeInTransaction(m,c,a,e,randomUUID(),"Trusted recipe work order",op);
  const [balance]=await m.query("SELECT entitlement_id FROM commitment_balances WHERE account_id=$1",[account.id]);
  if (balance.entitlement_id!==entitlement.id) await event(account.id,entitlement.id,{kind:"authorize",payload:{}});
  await event(account.id,entitlement.id,{kind:"open",payload:{claim:outputClaim,quantity,source:{kind:"synthetic:work_order_output",id,slice:"output"}}});
  const inputs=budget.map(b=>({id:randomUUID(),item_id:b.item,unit:b.unit,planned_quantity:b.quantity,source:definition.inputs.find(v=>v.item_id===b.item)}));
  await m.query(`INSERT INTO production_work_orders(id,organization_id,number,output_item_id,recipe_id,recipe_snapshot,project_id,site_id,demand_revision,planned_quantity,unit,inputs,status,created_by,released_by,updated_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'in_progress',$13,$13,$13)`,[id,c.organization,`D3-${id}`,definition.output_item_id,i.recipe,definition,i.project,i.site,i.demandRevision,quantity,i.unit,JSON.stringify(inputs),c.actor]);
  await m.query(`INSERT INTO commitment_work_orders(order_id,organization_id,source_id,output_claim,approval_id,demand_line,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,c.organization,i.source,outputClaim,i.approval,lines[0].l,c.actor,key]);
  const materials: WorkOrderResult["materials"]=[];
  for (const [index,b] of budget.entries()) {
    const material=randomUUID(), claim=randomUUID(), reservation=randomUUID();
    const a=await ledger.createAccount(c,{project:i.project,site:i.site,obligation:`recipe:${id}:${b.item}`,dimension:"recipe_material",item:`${id}/${b.item}`,unit:b.unit,selector:{item:b.item,workOrder:id}});
    const proof={order:id,outputClaim,recipe:i.recipe,item:b.item,quantity:b.quantity,unit:b.unit,conversion:"1"};
    const e=await ledger.entitlement(c,a,i.approval,i.demandRevision,b.quantity,proof);
    await event(a,e,{kind:"authorize",payload:{}});
    await event(a,e,{kind:"open",payload:{claim,quantity:b.quantity,source:{kind:"synthetic:work_order_material",id,slice:b.item}}});
    await m.query(`INSERT INTO production_input_reservations(id,organization_id,order_id,line_id,item_id,quantity,unit,status,created_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,'budgeted',$8)`,[reservation,c.organization,id,inputs[index].id,b.item,b.quantity,b.unit,c.actor]);
    await m.query(`INSERT INTO commitment_work_order_materials(id,organization_id,order_id,item_id,account_id,entitlement_id,claim_id,reservation_id)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[material,c.organization,id,b.item,a,e,claim,reservation]);
    materials.push({id:material,...b});
  }
  const result={id,materials}; await audit(m,c,id,"WORK_ORDER_CLAIM",result); return result;
}

export async function issueWorkOrder(m: EntityManager, c: LedgerContext, i: WorkOrderIssue, key: string): Promise<WorkOrderIssueResult> {
  exact(i,["order","material","source","quantity","unit","location","reason"]);
  if (![i.order,i.material,i.source].every(v=>uuid.test(v)) || typeof i.location!=="string" || !i.location.trim() || i.location.length>100 || typeof i.reason!=="string" || !i.reason.trim() || i.reason.length>1000) throw Error("Valid issue source, location and reason required");
  const quantity=stockText(stockUnits(i.quantity));if(!stockUnits(quantity))throw Error("Positive issue required");
  const [scope]=await m.query(`SELECT w.*,c.approval_id FROM production_work_orders w JOIN commitment_work_orders c ON c.order_id=w.id AND c.organization_id=w.organization_id WHERE w.id=$1 AND w.organization_id=$2`,[i.order,c.organization]);
  if(!scope)throw Error("Owned trusted work order required");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",[c.organization,scope.project_id,scope.site_id,scope.demand_revision,scope.approval_id]);
  await m.query("SELECT id FROM production_work_orders WHERE id=$1 FOR UPDATE",[i.order]);
  const [material]=await m.query(`SELECT x.*,e.cap FROM commitment_work_order_materials x JOIN commitment_entitlements e ON e.id=x.entitlement_id WHERE x.id=$1 AND x.order_id=$2 AND x.organization_id=$3`,[i.material,i.order,c.organization]);
  if(!material||scope.status!=="in_progress")throw Error("Active owned material authority required");
  const [item]=await m.query("SELECT * FROM inventory_items WHERE id=$1 AND organization_id=$2 FOR UPDATE",[material.item_id,c.organization]);
  if(!item||item.unit!==i.unit)throw Error("Canonical input unit required");
  const [claim]=await m.query("SELECT * FROM commitment_claims WHERE id=$1 FOR UPDATE",[material.claim_id]);
  if(stockUnits(claim.held)<stockUnits(quantity))throw Error("Recipe material allowance exhausted");
  // Legacy physical reservations retain priority; budgeted rows convey no physical reservation.
  const [free]=await m.query(`SELECT coalesce((SELECT sum(qty_delta) FROM stock_ledger WHERE organization_id=$1 AND item_id=$2 AND verification_entry_id IS NOT NULL),0)
    -coalesce((SELECT sum(quantity) FROM project_stock_reservations WHERE organization_id=$1 AND item_id=$2 AND status='active'),0)
    -coalesce((SELECT sum(quantity) FROM production_input_reservations WHERE organization_id=$1 AND item_id=$2 AND status='active'),0) quantity`,[c.organization,item.id]);
  const b=await locationBalance(m,c.organization,item.id,i.location);
  if(b.quantity===null||b.unit!==i.unit||stockUnits(b.quantity)<stockUnits(quantity)||stockUnits(String(free.quantity))<stockUnits(quantity))throw Error("Insufficient verified unreserved stock");
  const [coverage]=await m.query(`SELECT (t->>'complete_coverage')::boolean complete FROM physical_stocktakes s,LATERAL jsonb_array_elements(s.targets) t WHERE s.organization_id=$1 AND s.status='posted' AND t->>'item_id'=$2 ORDER BY s.updated_at DESC,s.id DESC LIMIT 1`,[c.organization,item.id]);
  if(!coverage?.complete)throw Error("Complete physical verification required");
  const id=randomUUID(),physical=randomUUID();
  await m.query(`UPDATE production_input_reservations SET quantity=quantity-$1,status=CASE WHEN quantity=$1 THEN 'consumed' ELSE 'budgeted' END WHERE id=$2`,[quantity,material.reservation_id]);
  await m.query(`INSERT INTO production_input_issues(id,organization_id,order_id,reservation_id,item_id,quantity,unit,location,reason,issued_by,ledger_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[id,c.organization,i.order,material.reservation_id,item.id,quantity,i.unit,i.location,i.reason,c.actor,physical]);
  await m.query(`INSERT INTO stock_ledger(id,organization_id,item_id,item_name,item_sku,qty_delta,running_balance,unit_cost,transaction_type,reference_type,reference_id,reason_code,actor_id,actor_name,verified_unit,verification_entry_id,physical_location,physical_sequence,production_issue_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,0,'KIT_CONSUMPTION','production_issue',$8::text,'PRODUCTION',$9::uuid,($9::uuid)::text,$10,$8::uuid,$11,$12,$8::uuid)`,[physical,c.organization,item.id,item.name,item.sku,stockText(-stockUnits(quantity)),stockText(stockUnits(b.quantity)-stockUnits(quantity)),id,c.actor,i.unit,i.location,b.sequence+1]);
  const event=await new CommitmentLedgerService(m).executeInTransaction(m,c,material.account_id,material.entitlement_id,randomUUID(),i.reason,{kind:"consume",payload:{claim:material.claim_id,quantity}});
  const result={id,order:i.order,ledger:physical,event:event.id,quantity};
  await audit(m,c,id,"MATERIAL_ISSUE",result);
  await m.query(`INSERT INTO commitment_work_order_issues(issue_id,organization_id,material_id,source_id,event_id,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,c.organization,i.material,i.source,event.id,c.actor,key]);
  await m.query("UPDATE production_work_orders SET revision=revision+1,updated_by=$1,updated_at=clock_timestamp() WHERE id=$2",[c.actor,i.order]);
  return result;
}
