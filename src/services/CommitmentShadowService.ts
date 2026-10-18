import { createHash } from "node:crypto";
import type { DataSource } from "typeorm";
import type { LedgerContext } from "./CommitmentLedgerService";
import { planningUnits } from "./CommitmentLedgerService";
import { canonicalRequirementJSON } from "./RequirementApprovalService";

export interface ShadowLink { kind: string; source: string; claim: string }
const sourceTables = ["project_stock_reservations", "purchase_requests", "purchase_orders", "production_work_orders", "packing_orders", "delivery_orders"] as const;

/** Explicit caller-supplied mappings are diagnostic hypotheses, never persisted authorization. */
export class CommitmentShadowService {
  constructor(private readonly db: DataSource) {}
  async inspect(context: LedgerContext, links: ShadowLink[] = []) {
    return this.db.transaction("REPEATABLE READ", async m => {
      await m.query("SET TRANSACTION READ ONLY");
      if (!(await m.query(`SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND is_active
        AND role IN ('admin','super_admin')`, [context.actor, context.organization])).length)
        throw new Error("Active tenant administrator required");
      const diagnostics: { code: string; kind: string; source: string }[] = [];
      const records: { kind: string; row: Record<string, unknown> }[] = [];
      const claims = await m.query(`SELECT c.*,a.project_id,a.site_id,a.unit,a.dimension,a.item_key FROM commitment_claims c
        JOIN commitment_accounts a ON a.id=c.account_id WHERE c.organization_id=$1 ORDER BY c.id`, [context.organization]);
      const balances = await m.query("SELECT * FROM commitment_balances WHERE organization_id=$1 ORDER BY account_id", [context.organization]);
      const used = new Set<string>(), seen = new Set<string>(), totals = new Map<string, bigint>();
      for (const kind of sourceTables) {
        const projection = kind === "project_stock_reservations" ? "to_jsonb(t)||jsonb_build_object('quantity',t.quantity::text)" : "to_jsonb(t)";
        const rows = await m.query(`SELECT ${projection} row FROM ${kind} t WHERE organization_id=$1 ORDER BY id`, [context.organization]);
        for (const { row } of rows) {
          records.push({ kind, row });
          const source = String(row.id), matches = links.filter(l => l.kind === kind && l.source === source);
          const report = (code: string) => diagnostics.push({ code, kind, source });
          if (!matches.length) { report("missing_source_lineage"); report("historical_reconciliation_required"); continue; }
          if (matches.length !== 1 || used.has(matches[0].claim)) { report("potential_duplicate_commitment"); continue; }
          const claim = claims.find((c: any) => c.id === matches[0].claim);
          if (!claim || claim.project_id !== row.project_id || claim.site_id !== row.site_id ||
            (kind === "project_stock_reservations" && (claim.dimension !== "material" || claim.item_key !== row.item_id))) {
            report("unproven_or_mismatched_lineage"); continue;
          }
          used.add(claim.id); seen.add(`${kind}:${source}`);
          // Orders containing lines/packages need a later source-specific evidence adapter.
          if (typeof row.quantity !== "string" || row.unit !== claim.unit) { report("quantity_requires_manual_evidence"); continue; }
          try {
            const q = planningUnits(row.quantity);
            if (q !== planningUnits(claim.quantity)) report("inconsistent_quantity");
            totals.set(claim.account_id, (totals.get(claim.account_id) ?? 0n) + q);
          } catch { report("quantity_requires_manual_evidence"); }
        }
      }
      for (const link of links) if (!seen.has(`${link.kind}:${link.source}`))
        diagnostics.push({ code: "unresolved_explicit_link", kind: link.kind, source: link.source });
      for (const balance of balances) if ((totals.get(balance.account_id) ?? 0n) > planningUnits(balance.approved))
        diagnostics.push({ code: "approval_cap_deficit", kind: "account", source: balance.account_id });
      const evidenceHash = createHash("sha256").update(canonicalRequirementJSON({ records, claims, balances, links })).digest("hex");
      return { label: "DIAGNOSTIC ONLY — grants no execution rights", evidenceHash, recordCount: records.length, diagnostics };
    });
  }
}
