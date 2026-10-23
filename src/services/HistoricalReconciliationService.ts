import { createHash } from "node:crypto";
import type { DataSource } from "typeorm";
import { DraftKitError } from "./ProductTemplateService";
import { canonicalRequirementJSON } from "./RequirementApprovalService";
import { sqlIdentifier } from "../security/databaseBoundary";
import { reconciliationSources, type ReconciliationSource, type ReconciliationPreview } from "../features/inventory/reconciliationTypes";

const hash = (value: unknown) => createHash("sha256").update(canonicalRequirementJSON(value)).digest("hex");

/** Discovery only. A source row or its status never proves stock, demand approval or custody. */
export class HistoricalReconciliationService {
  constructor(private readonly db: DataSource) {}

  async preview(organization: string, actor: string, source: unknown, offset: unknown, authorityAvailable = false): Promise<ReconciliationPreview> {
    if (typeof source !== "string" || !reconciliationSources.includes(source as ReconciliationSource)
      || typeof offset !== "string" || !/^(0|[1-9]\d{0,6})$/.test(offset))
      throw new DraftKitError(400, "Select a supported source and a nonnegative page offset");
    const kind = source as ReconciliationSource;
    const schema = this.db.options.type === "postgres" ? this.db.options.schema ?? "public" : "public";
    return this.db.transaction("REPEATABLE READ", async manager => {
      await manager.query("SET TRANSACTION READ ONLY");
      const users: { id: string }[] = await manager.query(
        "SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND is_active AND role IN ('admin','super_admin')", [actor, organization]);
      if (!users.length) throw new DraftKitError(403, "Active tenant administrator required for historical evidence review");
      const tables: { name: string }[] = await manager.query(
        "SELECT tablename name FROM pg_tables WHERE schemaname=$2 AND tablename=$1", [kind, schema]);
      if (!tables.length) throw new DraftKitError(409, "Source schema unavailable; reconciliation is incomplete");
      const [{installed}] = await manager.query("SELECT to_regclass($1) IS NOT NULL installed", [`${sqlIdentifier(schema)}.trusted_historical_decisions`]);
      // Table identifiers come exclusively from the fixed allowlist above. Quantities stay decimal strings.
      const rows: { evidence: Record<string, unknown> }[] = await manager.query(
        `SELECT to_jsonb(t) || jsonb_build_object('quantity',to_jsonb(t)->>'quantity') evidence
         FROM ${sqlIdentifier(schema)}.${sqlIdentifier(kind)} t WHERE organization_id=$1 ORDER BY id LIMIT 51 OFFSET $2`, [organization, Number(offset)]);
      const records = rows.slice(0, 50).map(({ evidence }) => ({
        id: String(evidence.id), label: String(evidence.name ?? evidence.id),
        lifecycle: typeof evidence.status === "string" ? evidence.status : null,
        stock: kind === "inventory_items" ? "unknown" as const : "unreconciled" as const,
        recordedQuantity: typeof evidence.quantity === "string" ? evidence.quantity : null,
        verifiedQuantity: null,
        unit: typeof evidence.unit === "string" ? evidence.unit : null,
        blockers: ["Authoritative historical lineage has not been reviewed",
          ...(kind === "inventory_items" ? ["Historical quantity is not verified physical availability; consult posted stocktakes"]
            : ["Source status does not establish approved school demand, consumption or delivery"]),
          "Evidence references and an attributed administrator decision are required",
          "Review judgments do not authorize historical activation"],
        evidenceHash: hash(evidence), evidence,
      }));
      const decisions = installed && records.length ? await manager.query(`SELECT * FROM trusted_historical_decisions
        WHERE organization_id=$1 AND source=$2 AND record_id=ANY($3::uuid[]) ORDER BY revision DESC`, [organization,kind,records.map(r=>r.id)]) : [];
      const preview = {
        mode: "read_only" as const, source: kind, offset: Number(offset), hasMore: rows.length > 50,
        records: records.map(record=>({...record, decisions: decisions.filter((decision: {record_id:string})=>decision.record_id===record.id)})),
        decisionsEnabled: authorityAvailable && installed,
        effects: { stock: "unchanged" as const, commitments: "unchanged" as const, custody: "unchanged" as const, fulfillment: "unchanged" as const },
        authorizationRequired: ["Evidence decisions grant no operational execution rights",
          "Separate business authorization for historical mapping or demand approval",
          "Separate stock/custody correction authority and activation approval"],
      };
      return { ...preview, evidenceHash: hash({ organization, ...preview }) };
    });
  }
}
