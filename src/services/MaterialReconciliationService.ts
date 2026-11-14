import { createHash } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { DataSource, EntityManager } from 'typeorm';
import { env } from '../config/env';
import { DraftKitError } from './ProductTemplateService';
import { canonicalRequirementJSON } from './RequirementApprovalService';
import { trustedProjectProgress } from './TrustedCompletionService';
import { diagnoseMaterial, type EvidenceLane, type EvidenceRow, type MaterialReconciliation } from '../features/inventory/materialReconciliation';

export const reconciliationReaders = ['admin','super_admin','manager','inventory_staff','staff','viewer','project_staff','editor'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Static SQL only. Each join remains scoped through its authoritative tenant/project parent.
const account = 'JOIN commitment_accounts a ON a.id=t.account_id AND a.organization_id=$1 AND a.project_id=$2';
const order = 'JOIN production_work_orders w ON w.id=t.order_id AND w.organization_id=$1 AND w.project_id=$2';
const plan = 'JOIN trusted_packing_plans p ON p.id=t.plan_id AND p.organization_id=$1 AND p.project_id=$2';
const specs: {source:string; tables:string[]; sql:string}[] = [
  {source:'accounts',tables:['commitment_accounts','commitment_balances','commitment_claims'],sql:`SELECT a.*,b.approved::text,b.fulfilled::text,b.held::text,b.sequence,
    (b.approved-b.fulfilled-b.held)::text unallocated,
    (SELECT coalesce(sum(c.held),0)::text FROM commitment_claims c WHERE c.account_id=a.id AND c.organization_id=$1) claim_held
    FROM commitment_accounts a LEFT JOIN commitment_balances b ON b.account_id=a.id AND b.organization_id=$1 WHERE a.organization_id=$1 AND a.project_id=$2`},
  ...['entitlements','claims','events','sources','reconciliation_cases'].map(source => ({source,tables:[`commitment_${source}`,'commitment_accounts'],sql:`SELECT t.* FROM commitment_${source} t ${account}`})),
  {source:'pr',tables:['commitment_pr_lines','commitment_accounts'],sql:`SELECT t.* FROM commitment_pr_lines t ${account}`},
  {source:'po',tables:['commitment_po_lines','commitment_accounts'],sql:`SELECT t.* FROM commitment_po_lines t ${account}`},
  {source:'coverage',tables:['commitment_po_coverage','commitment_po_lines','commitment_accounts'],sql:`SELECT t.* FROM commitment_po_coverage t JOIN commitment_po_lines l ON l.order_id=t.order_id JOIN commitment_accounts a ON a.id=l.account_id AND a.organization_id=$1 AND a.project_id=$2`},
  {source:'receipts',tables:['purchase_goods_receipts','purchase_orders'],sql:`SELECT t.* FROM purchase_goods_receipts t JOIN purchase_orders p ON p.id=t.po_id AND p.organization_id=$1 WHERE t.organization_id=$1 AND EXISTS(SELECT 1 FROM jsonb_array_elements(p.planning_lines) l WHERE l->>'project_id'=$2::text)`},
  {source:'receipt_witnesses',tables:['commitment_receipts','purchase_goods_receipts','purchase_orders'],sql:`SELECT t.* FROM commitment_receipts t JOIN purchase_goods_receipts g ON g.id=t.receipt_id AND g.organization_id=$1 JOIN purchase_orders p ON p.id=g.po_id AND p.organization_id=$1 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(p.planning_lines) l WHERE l->>'project_id'=$2::text)`},
  {source:'work_orders',tables:['production_work_orders'],sql:'SELECT t.* FROM production_work_orders t WHERE t.organization_id=$1 AND t.project_id=$2'},
  {source:'recipes',tables:['production_recipes','production_work_orders'],sql:'SELECT t.* FROM production_recipes t WHERE t.organization_id=$1 AND EXISTS(SELECT 1 FROM production_work_orders w WHERE w.recipe_id=t.id AND w.organization_id=$1 AND w.project_id=$2)'},
  {source:'authority',tables:['commitment_work_orders','production_work_orders'],sql:`SELECT t.* FROM commitment_work_orders t ${order}`},
  {source:'materials',tables:['commitment_work_order_materials','production_work_orders'],sql:`SELECT t.* FROM commitment_work_order_materials t ${order}`},
  {source:'issues',tables:['production_input_issues','production_work_orders'],sql:`SELECT t.* FROM production_input_issues t ${order}`},
  {source:'issue_witnesses',tables:['commitment_work_order_issues','commitment_work_order_materials','production_work_orders'],sql:`SELECT t.* FROM commitment_work_order_issues t JOIN commitment_work_order_materials m ON m.id=t.material_id AND m.organization_id=$1 JOIN production_work_orders w ON w.id=m.order_id AND w.organization_id=$1 AND w.project_id=$2`},
  {source:'output',tables:['production_output_custody','production_work_orders'],sql:`SELECT t.* FROM production_output_custody t ${order}`},
  {source:'packing',tables:['trusted_packing_plans'],sql:'SELECT t.* FROM trusted_packing_plans t WHERE t.organization_id=$1 AND t.project_id=$2'},
  ...['allocations','qc'].map(source=>({source:`packing_${source}`,tables:[`trusted_packing_${source}`,'trusted_packing_plans'],sql:`SELECT t.* FROM trusted_packing_${source} t ${plan}`})),
  ...['dispatches','dispatch_units'].map(source=>({source,tables:[`trusted_${source}`,'trusted_packing_plans'],sql:`SELECT t.* FROM trusted_${source} t ${plan}`})),
  {source:'delivery',tables:['trusted_delivery_receipts','trusted_dispatches','trusted_packing_plans'],sql:`SELECT t.* FROM trusted_delivery_receipts t JOIN trusted_dispatches d ON d.id=t.dispatch_id AND d.organization_id=$1 JOIN trusted_packing_plans p ON p.id=d.plan_id AND p.organization_id=$1 AND p.project_id=$2`},
  {source:'reservations',tables:['project_stock_reservations'],sql:'SELECT t.* FROM project_stock_reservations t WHERE t.organization_id=$1 AND t.project_id=$2'},
  {source:'input_reservations',tables:['production_input_reservations','production_work_orders'],sql:`SELECT t.* FROM production_input_reservations t ${order}`},
  ...['project_stock_reservations','production_input_reservations'].map(table=>({source:`competing_${table}`,tables:[table,'commitment_accounts'],sql:`SELECT t.* FROM ${table} t WHERE t.organization_id=$1 AND t.status='active' AND EXISTS(SELECT 1 FROM commitment_accounts a WHERE a.organization_id=$1 AND a.project_id=$2 AND (a.item_key=t.item_id::text OR a.selector->>'item'=t.item_id::text))`})),
  {source:'physical_scopes',tables:['physical_stock_scopes','commitment_accounts'],sql:`SELECT t.* FROM physical_stock_scopes t WHERE t.organization_id=$1 AND EXISTS(SELECT 1 FROM commitment_accounts a WHERE a.organization_id=$1 AND a.project_id=$2 AND (a.item_key=t.item_id::text OR a.selector->>'item'=t.item_id::text))`},
  {source:'physical',tables:['stock_ledger','commitment_accounts'],sql:`SELECT t.* FROM stock_ledger t WHERE t.organization_id=$1 AND EXISTS(SELECT 1 FROM commitment_accounts a WHERE a.organization_id=$1 AND a.project_id=$2 AND (a.item_key=t.item_id::text OR a.selector->>'item'=t.item_id::text))`},
  {source:'physical_balances',tables:['stock_ledger','commitment_accounts'],sql:`SELECT t.item_id,t.physical_location,t.verified_unit,sum(t.qty_delta)::text quantity,max(t.physical_sequence) sequence FROM stock_ledger t WHERE t.organization_id=$1 AND t.verification_entry_id IS NOT NULL AND EXISTS(SELECT 1 FROM commitment_accounts a WHERE a.organization_id=$1 AND a.project_id=$2 AND (a.item_key=t.item_id::text OR a.selector->>'item'=t.item_id::text)) GROUP BY t.item_id,t.physical_location,t.verified_unit`},
  {source:'receipt_decisions',tables:['commitment_receipt_decisions','purchase_goods_receipts','purchase_orders'],sql:`SELECT t.* FROM commitment_receipt_decisions t JOIN purchase_goods_receipts g ON g.id=t.receipt_id AND g.organization_id=$1 JOIN purchase_orders p ON p.id=g.po_id AND p.organization_id=$1 WHERE EXISTS(SELECT 1 FROM jsonb_array_elements(p.planning_lines) l WHERE l->>'project_id'=$2::text)`},
  {source:'schools',tables:['planning_sites'],sql:'SELECT t.* FROM planning_sites t WHERE t.organization_id=$1 AND t.project_id=$2'},
  {source:'approvals',tables:['requirement_approvals'],sql:'SELECT t.* FROM requirement_approvals t WHERE t.organization_id=$1 AND t.project_id=$2'},
];

/** No authority pool, mutation API, migration, lock, grant or balancing event. */
export class MaterialReconciliationService {
  constructor(private readonly db: DataSource) {}
  async preview(token: string, project: string): Promise<MaterialReconciliation> {
    if (!uuid.test(project)) throw new DraftKitError(400,'Valid project identity required');
    let identity: jwt.JwtPayload;
    try {
      const claims = jwt.verify(token,env.jwtSecret,{algorithms:['HS256'],issuer:'experimind-auth',audience:'experimind-api'});
      if (typeof claims === 'string' || !uuid.test(claims.sub ?? '') || !uuid.test(claims.orgId ?? '') || !/^[a-f0-9]{64}$/.test(claims.sid ?? '') || claims.type || claims.purpose) throw Error('Invalid session');
      identity = claims;
    } catch { throw new DraftKitError(403,'Live tenant session required'); }
    const authorized = async (m:EntityManager) => (await m.query(`SELECT u.id FROM users u WHERE u.id=$1 AND u.organization_id=$2 AND u.is_active AND u.role=ANY($4::text[])
        AND EXISTS(SELECT 1 FROM refresh_tokens r WHERE r.user_id=u.id AND r.token_hash=$3 AND NOT r.is_revoked AND r.expires_at>clock_timestamp())
        AND NOT EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND s.refresh_token_hash=$3 AND (s.is_revoked OR s.expires_at<=clock_timestamp()))
        AND extract(epoch FROM clock_timestamp())<$5`,[identity.sub,identity.orgId,identity.sid,reconciliationReaders,identity.exp])).length;
    const result = await this.db.transaction('REPEATABLE READ',async m=>{
      await m.query('SET TRANSACTION READ ONLY');
      if (!await authorized(m)) throw new DraftKitError(403,'Live tenant session required');
      const [projectRow]: EvidenceRow[] = await m.query('SELECT id,revision FROM planning_projects WHERE id=$1 AND organization_id=$2 AND archived_at IS NULL',[project,identity.orgId]);
      if (!projectRow) throw new DraftKitError(404,'Project unavailable');
      const lanes: EvidenceLane[] = [];
      for (const spec of specs) {
        const installed: {present:boolean}[] = await m.query('SELECT to_regclass(name) IS NOT NULL present FROM unnest($1::text[]) name',[spec.tables]);
        const available = installed.every(t=>t.present);
        const rows: EvidenceRow[] = available ? await m.query(`SELECT * FROM (${spec.sql}) evidence ORDER BY to_jsonb(evidence)::text LIMIT 501`,[identity.orgId,project]) : [];
        lanes.push({source:spec.source,available,truncated:rows.length>500,rows:rows.slice(0,500)});
      }
      const issues = diagnoseMaterial(lanes,Number(projectRow.revision));
      const closureAvailable = (await m.query("SELECT to_regprocedure('requirement_d4_project_blocked(uuid,uuid)') IS NOT NULL present"))[0].present;
      const closureBlockers: string[] = closureAvailable ? (await trustedProjectProgress(m,identity.orgId!,project)).blockers : ['Closure authority unavailable; closure cannot be established'];
      closureBlockers.push(...issues.filter(i=>i.kind==='unresolved disposition'||i.kind==='incomplete delivery'||i.kind==='missing provenance').map(i=>`${i.source}/${i.identity}: ${i.detail}`));
      const snapshot = {mode:'read_only' as const,contract:'DRAFT / NOT AUTHORIZED' as const,software:'BLOCKED' as const,pilot:'NO-GO' as const,project:projectRow,lanes,issues,closureBlockers};
      return {...snapshot,witnessHash:createHash('sha256').update(canonicalRequirementJSON(JSON.parse(JSON.stringify(snapshot)))).digest('hex')};
    });
    // A fresh statement snapshot observes revocation/tenant/role changes during a long read.
    if (!await authorized(this.db.manager)) throw new DraftKitError(403,'Live tenant session required');
    return result;
  }
}
