import { expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import type { User } from '../../entity/User';
import { AuthService } from '../../services/AuthService';
import { MaterialReconciliationService } from '../../services/MaterialReconciliationService';
import { exactQuantity } from '../../features/inventory/materialReconciliation';

export async function verifyMaterialReconciliation(h:{db:DataSource;runtime:DataSource;identity:DataSource;admin:User;other:User;password:string;evidence:Record<string,unknown>},token:string) {
  const service=new MaterialReconciliationService(h.runtime);
  const [project]=await h.db.query('SELECT p.id FROM planning_projects p JOIN commitment_accounts a ON a.project_id=p.id WHERE p.organization_id=$1 AND p.archived_at IS NULL ORDER BY p.id LIMIT 1',[h.admin.organization_id]);
  expect(project).toBeDefined();
  const fingerprint=async()=>h.db.query(`SELECT md5(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text)) hash FROM
    (SELECT 'events' kind,to_jsonb(e) evidence FROM commitment_events e UNION ALL SELECT 'claims',to_jsonb(c) FROM commitment_claims c
    UNION ALL SELECT 'balances',to_jsonb(b) FROM commitment_balances b UNION ALL SELECT 'stock',to_jsonb(s) FROM stock_ledger s) t`);
  const before=await fingerprint();
  const snapshot=await service.preview(token,project.id);
  expect(snapshot.mode).toBe('read_only');expect(snapshot.contract).toBe('DRAFT / NOT AUTHORIZED');
  expect(snapshot.lanes.every(l=>l.available)).toBe(true);
  expect(snapshot.witnessHash).toMatch(/^[a-f0-9]{64}$/);
  expect(await service.preview(token,project.id)).toEqual(snapshot);
  // Global synthetic-tenant properties, independent of the selected display project.
  const balances=await h.runtime.query('SELECT * FROM commitment_balances WHERE organization_id=$1',[h.admin.organization_id]);
  for(const b of balances) {
    expect(exactQuantity(b.approved)>=exactQuantity(b.fulfilled)+exactQuantity(b.held)).toBe(true);
    const [claims]=await h.runtime.query('SELECT coalesce(sum(held),0)::text held FROM commitment_claims WHERE account_id=$1',[b.account_id]);
    expect(exactQuantity(b.held)).toBe(exactQuantity(claims.held));
  }
  const claims=await h.runtime.query('SELECT * FROM commitment_claims WHERE organization_id=$1 AND NOT retired',[h.admin.organization_id]);
  for(const c of claims)expect(exactQuantity(c.quantity)).toBe(exactQuantity(c.held)+exactQuantity(c.fulfilled)+exactQuantity(c.released));
  const overlap=await h.runtime.query(`SELECT a.id FROM commitment_po_coverage a JOIN commitment_po_coverage b ON a.id<b.id
    AND a.claim_id=b.claim_id AND a.source_slice=b.source_slice AND a.start_quantity<b.end_quantity AND b.start_quantity<a.end_quantity`);
  expect(overlap).toEqual([]);
  const lineage=await h.runtime.query(`SELECT e.id FROM commitment_entitlements e JOIN commitment_accounts a ON a.id=e.account_id
    JOIN requirement_approvals p ON p.id=e.approval_id WHERE e.organization_id=$1 AND (e.organization_id<>a.organization_id OR a.project_id<>p.project_id)` ,[h.admin.organization_id]);
  expect(lineage).toEqual([]);
  const residualProjects=await h.runtime.query(`SELECT DISTINCT a.project_id FROM commitment_accounts a LEFT JOIN commitment_balances b ON b.account_id=a.id
    WHERE a.organization_id=$1 AND (coalesce(b.held,0)>0 OR EXISTS(SELECT 1 FROM commitment_claims c WHERE c.account_id=a.id AND c.held>0))`,[h.admin.organization_id]);
  expect(residualProjects.length).toBeGreaterThan(0);
  for(const p of residualProjects)expect((await h.runtime.query('SELECT requirement_d4_project_blocked($1,$2) blocked',[h.admin.organization_id,p.project_id]))[0].blocked).toBe(true);
  for(const lane of snapshot.lanes) for(const row of lane.rows) if(row.organization_id) expect(row.organization_id).toBe(h.admin.organization_id);
  const other=(await new AuthService(h.identity).login(h.other.email,h.password)).token!;
  await expect(service.preview(other,project.id)).rejects.toMatchObject({status:404});
  await expect(service.preview(token,randomUUID())).rejects.toMatchObject({status:404});
  await expect(service.preview(token,'invalid')).rejects.toMatchObject({status:400});
  const auth=new AuthService(h.identity),revoked=await auth.login(h.admin.email,h.password);
  await auth.revokeRefreshToken(revoked.refreshToken!);
  await expect(service.preview(revoked.token!,project.id)).rejects.toMatchObject({status:403});
  await h.db.query("UPDATE users SET role='customer' WHERE id=$1",[h.admin.id]);
  try {await expect(service.preview(token,project.id)).rejects.toMatchObject({status:403});}
  finally {await h.db.query('UPDATE users SET role=$2 WHERE id=$1',[h.admin.id,h.admin.role]);}
  expect(await fingerprint()).toEqual(before);
  h.evidence.material_reconciliation={project:project.id,actor:h.admin.id,witnessHash:snapshot.witnessHash,read_only:true,tenant_denial:true,revoked_denial:true,live_role_denial:true,conserved_accounts:balances.length,conserved_claims:claims.length,residual_projects_denied:residualProjects.length,source_intervals_disjoint:true,lineage_preserved:true,lanes:snapshot.lanes.length,contract:snapshot.contract};
}
