import { createHash } from "node:crypto";
import type { DataSource } from "typeorm";
import { DraftKitError } from "./ProductTemplateService";
import { canonicalRequirementJSON } from "./RequirementApprovalService";
import { sqlIdentifier } from "../security/databaseBoundary";
import { reconciliationSources, type HistoricalDecisionRecord } from "../features/inventory/reconciliationTypes";

const digest = (value: unknown) => createHash("sha256").update(canonicalRequirementJSON(value)).digest("hex");
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A proposal validator, never a source-claim allocator or operational authorizer. */
export class HistoricalLineageSimulationService {
  constructor(private readonly db: DataSource) {}
  async simulate(organization: string, actor: string, input: unknown) {
    if (!input || typeof input !== "object" || Object.keys(input).join() !== "links")
      throw new DraftKitError(400, "Supply only proposed links");
    const links = (input as { links: unknown }).links;
    if (!Array.isArray(links) || !links.length || links.length > 20 || links.some(link =>
      !link || typeof link !== "object" || Object.keys(link).sort().join() !== "from,to" ||
      typeof link.from !== "string" || typeof link.to !== "string" || !uuid.test(link.from) || !uuid.test(link.to)))
      throw new DraftKitError(400, "Supply 1–20 pairs of review decision identities");
    return this.db.transaction("REPEATABLE READ", async manager => {
      await manager.query("SET TRANSACTION READ ONLY");
      const users = await manager.query("SELECT id FROM users WHERE id=$1 AND organization_id=$2 AND is_active AND role IN ('admin','super_admin')", [actor, organization]);
      if (!users.length) throw new DraftKitError(403, "Active tenant administrator required");
      const ids = [...new Set(links.flatMap(link => [link.from, link.to]))];
      const decisions: HistoricalDecisionRecord[] = await manager.query("SELECT * FROM trusted_historical_decisions WHERE organization_id=$1 AND id=ANY($2::uuid[])", [organization, ids]);
      if (decisions.length !== ids.length) throw new DraftKitError(404, "Review decision unavailable in this organization");
      const conflicts: string[] = [];
      for (const decision of decisions) {
        if (!reconciliationSources.includes(decision.source)) throw new DraftKitError(409, "Unsupported historical source");
        const [latest] = await manager.query("SELECT id FROM trusted_historical_decisions WHERE organization_id=$1 AND source=$2 AND record_id=$3 ORDER BY revision DESC LIMIT 1", [organization, decision.source, decision.record_id]);
        const [current] = await manager.query(`SELECT to_jsonb(t)||jsonb_build_object('quantity',to_jsonb(t)->>'quantity') evidence FROM ${sqlIdentifier(decision.source)} t WHERE organization_id=$1 AND id=$2`, [organization, decision.record_id]);
        if (latest?.id !== decision.id || decision.decision !== "accepted_for_review") conflicts.push(`${decision.id}: current accepted review required`);
        if (!current || digest(current.evidence) !== decision.evidence_hash) conflicts.push(`${decision.id}: source evidence changed or missing`);
      }
      const byId = new Map(decisions.map(d => [d.id, d]));
      const outgoing = new Set<string>(), incoming = new Set<string>();
      const next = new Map<string, string>();
      const identity = (d: HistoricalDecisionRecord) => `${d.source}:${d.record_id}`;
      for (const link of links) {
        const from = byId.get(link.from)!, to = byId.get(link.to)!;
        const a = identity(from), b = identity(to);
        if (a === b || outgoing.has(a) || incoming.has(b)) conflicts.push(`${a} → ${b}: duplicate, competing or self claim`);
        outgoing.add(a); incoming.add(b); next.set(a, b);
        if (!from.evidence_refs.some(ref => to.evidence_refs.some(other => canonicalRequirementJSON(ref) === canonicalRequirementJSON(other))))
          conflicts.push(`${a} → ${b}: no identical evidence reference and provenance`);
      }
      for (const start of next.keys()) {
        const visited = new Set<string>(); let node: string | undefined = start;
        while (node && next.has(node)) {
          if (visited.has(node)) { conflicts.push(`${start}: cyclic lineage`); break; }
          visited.add(node); node = next.get(node);
        }
      }
      const accounting: Record<string, unknown> = {};
      for (const table of ["stock_ledger", "commitment_balances", "commitment_claims", "commitment_events", "production_output_custody", "trusted_packing_allocations", "trusted_delivery_receipts"])
        accounting[table] = (await manager.query(`SELECT count(*)::int rows,md5(coalesce(string_agg(row_to_json(t)::text,'|' ORDER BY row_to_json(t)::text),'')) fingerprint FROM ${sqlIdentifier(table)} t WHERE organization_id=$1`, [organization]))[0];
      return {
        mode: "simulation_only" as const, activationEnabled: false as const, claimsReserved: false as const,
        reviewer: actor, links, conflicts: [...new Set(conflicts)], structurallyValid: conflicts.length === 0,
        evidenceHash: digest({ organization, decisions, links, accounting }), decisions,
        before: accounting, after: accounting, verifiedHistoricalQuantity: null,
        authorizationRequired: ["Independent verification of each referenced authoritative document and its linkage scope",
          "Approved mapping contract defining source cardinality, quantities, units and treatment of conflicting claims",
          "Explicit business authorization and a separately reviewed atomic activation procedure with global source-claim uniqueness"],
      };
    });
  }
}
