import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import type { LedgerContext } from "./CommitmentLedgerService";
import { materializePacking } from "../features/packing/packingPlan";
import type { PlanningContent, DemandLine } from "../features/projects/planningTypes";
import type { PlanningVersion } from "../features/projects/requirementPlanning";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";
import type { qcChecks } from "../features/packing/packingTypes";

export interface PackingPlanInput { project: string; site: string; approval: string; demandRevision: number }
export interface PackingAllocationInput { plan: string; package: string; output: string; line: string; quantity: string }
export interface PackingQCInput {
  plan: string; package: string; allocationRevision: number; decision: "accept" | "reject";
  checks: Record<(typeof qcChecks)[number], { pass: boolean; evidence: string }>; notes: string;
}
export type PackingReceipt = Record<string, unknown>;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function exact(input: object, keys: string[], ids: string[]) {
  if (!input || Object.keys(input).length !== keys.length || Object.keys(input).some(k => !keys.includes(k)) || ids.some(id => !uuid.test(id)))
    throw Error("Exact packing identity required");
}
async function audit(m: EntityManager, c: LedgerContext, table: string, row: PackingReceipt) {
  delete row.created_at;
  await m.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after")
    VALUES($1,$2,$3,$4,'trusted_packing',$5,$6::jsonb)`, [randomUUID(),c.organization,c.actor,table,row.id,JSON.stringify(row)]);
  return row;
}
export async function createPackingPlan(m: EntityManager,c: LedgerContext,i: PackingPlanInput,key: string): Promise<PackingReceipt> {
  exact(i,["project","site","approval","demandRevision"],[i.project,i.site,i.approval]);
  if (!Number.isInteger(i.demandRevision)) throw Error("Approved revision required");
  await m.query("SELECT requirement_assert($1,$2,$3,$4,$5)",[c.organization,i.project,i.site,i.demandRevision,i.approval]);
  const [approval]: {snapshot: {content: PlanningContent; lines: DemandLine[]}}[] = await m.query(
    "SELECT snapshot FROM requirement_approvals WHERE id=$1 AND organization_id=$2",[i.approval,c.organization]);
  const site = approval.snapshot.content.sites.find(s => s.id === i.site);
  if (!site) throw Error("Approved school required");
  const versions: PlanningVersion[] = await m.query(`SELECT id,name,version_number,subjects FROM product_template_versions
    WHERE organization_id=$1 AND status='published' AND id=ANY($2::uuid[])`,[c.organization,site.selections.map(s=>s.version_id)]);
  // Named Science/Math products must retain the explicitly approved crate contract.
  for (const version of versions) for (const subject of version.subjects) {
    if (/math/i.test(subject.name) && subject.crates?.some(c=>c.kind==='common'||c.kind==='universal')) throw Error("Math cannot allocate Science crates");
    if (/science/i.test(subject.name)) for(const grade of subject.grades) {
      const selected=site.selections.some(s=>s.version_id===version.id&&(s.context.grade_quantities[grade.id]??0)>0);
      if(selected&&(subject.crates??[]).filter(c=>c.kind==='common'&&c.rule.kind==='selected_sets'&&c.rule.components.length===1&&c.rule.components[0].grade_id===grade.id).length!==1)
        throw Error("Each selected Science grade requires exactly one common-crate definition");
    }
    if (/science/i.test(subject.name)) for (const crate of subject.crates??[]) {
      const rule=crate.rule;
      if (crate.kind==='common' && (rule.kind!=='selected_sets'||rule.components.length!==1||rule.components[0].quantity!==1||rule.components[0].subject_id!==subject.id||!subject.grades.some(g=>g.id===rule.components[0].grade_id)))
        throw Error("Science common crate requires one grade set");
      if (crate.kind==='universal' && (crate.rule.kind!=='complete_sets'||crate.rule.components.length!==3||
        crate.rule.components.some(c=>c.subject_id!==subject.id||c.quantity!==1)||
        [...new Set(crate.rule.components.map(c=>subject.grades.find(g=>g.id===c.grade_id)?.name.replace(/^grade\s*/i,'').trim()))].sort().join(',')!=='10,8,9'))
        throw Error("Science universal crate requires explicit Grades 8–10 complete sets");
    }
  }
  const snapshot=materializePacking(approval.snapshot.content.name,site,versions,approval.snapshot.lines.filter(l=>l.site_id===i.site));
  const [row] = await m.query(`INSERT INTO trusted_packing_plans(id,organization_id,project_id,site_id,approval_id,demand_revision,snapshot,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[randomUUID(),c.organization,i.project,i.site,i.approval,i.demandRevision,JSON.stringify(snapshot),c.actor,key]);
  return audit(m,c,"trusted_packing_plans",row);
}
export async function allocatePackingOutput(m: EntityManager,c: LedgerContext,i: PackingAllocationInput,key: string): Promise<PackingReceipt> {
  exact(i,["plan","package","output","line","quantity"],[i.plan,i.package,i.output,i.line]);
  const quantity=stockText(stockUnits(i.quantity));
  if (stockUnits(quantity)===0n) throw Error("Positive physical allocation required");
  const [row]=await m.query(`INSERT INTO trusted_packing_allocations(id,organization_id,plan_id,package_id,output_id,line_id,quantity,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[randomUUID(),c.organization,i.plan,i.package,i.output,i.line,quantity,c.actor,key]);
  return audit(m,c,"trusted_packing_allocations",row);
}
export async function inspectPacking(m: EntityManager,c: LedgerContext,i: PackingQCInput,key: string): Promise<PackingReceipt> {
  exact(i,["plan","package","allocationRevision","decision","checks","notes"],[i.plan,i.package]);
  if (!Number.isInteger(i.allocationRevision)||i.allocationRevision<1||typeof i.notes!=="string") throw Error("Current custody and inspection notes required");
  const [row]=await m.query(`INSERT INTO trusted_packing_qc(id,organization_id,plan_id,package_id,allocation_revision,decision,checks,notes,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[randomUUID(),c.organization,i.plan,i.package,i.allocationRevision,i.decision,JSON.stringify(i.checks),i.notes,c.actor,key]);
  return audit(m,c,"trusted_packing_qc",row);
}
