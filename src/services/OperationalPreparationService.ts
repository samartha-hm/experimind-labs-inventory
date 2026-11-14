import type { DataSource } from "typeorm";
import { InventoryItem } from "../entity/InventoryItem";
import { Stocktake } from "../entity/Stocktake";
import { DraftKitError } from "./ProductTemplateService";
import { hardwareAcceptance, operationalGates, staffAcceptance } from "../features/inventory/operationalReadiness";
import { OperationalEvidenceService } from "./OperationalEvidenceService";

/** Preparation only. Never writes stock, readiness approvals or physical attestations. */
export class OperationalPreparationService {
  constructor(private readonly db: DataSource) {}
  async readiness(org: string, actor: string) {
    const sessions = await this.db.getRepository(Stocktake).countBy({organization_id: org});
    const evidence = await new OperationalEvidenceService(this.db).list(org, actor);
    return {mode: "read_only", pilot: "NO-GO", evidence_acceptance_available: false,
      generated_for: actor, generated_at: new Date().toISOString(), gates: operationalGates(sessions), evidence,
      staff: staffAcceptance.map(([workflow, role, scenario]) => ({workflow, role, scenario,
        status: "NOT STARTED", training: "Supervised walkthrough followed by independent practical exercise",
        evidence: "Named operator, authenticated identity, scenario/result, timestamp, evidence reference/hash and independent supervisor review",
        blocker: "No operational evidence accepted by this preparation screen"})),
      hardware: hardwareAcceptance.map(scenario => ({scenario, status: "NOT TESTED"})),
    };
  }
  async countSheet(org: string, actor: string, id: string, revision: number) {
    return this.db.transaction("REPEATABLE READ", async manager => {
      const session = await manager.findOneBy(Stocktake, {id, organization_id: org});
      if (!session) throw new DraftKitError(404, "Stocktake not found");
      if (session.revision !== revision) throw new DraftKitError(409, "Stale count sheet; reload the session");
      const items = await manager.find(InventoryItem, {where: {organization_id: org}});
      const rows = session.targets.flatMap(target => {
        const item = items.find(candidate => candidate.id === target.item_id);
        if (!item?.unit?.trim()) throw new DraftKitError(409, "Item identity or canonical unit requires review");
        return target.locations.map(location => ({item_id: item.id, sku: item.sku, name: item.name,
          canonical_unit: item.unit, location, quantity: null, physical_status: "UNKNOWN",
          count_pass: null, assigned_to: null, counted_by: null, counted_at: null,
          evidence_reference: null, evidence_sha256: null, reviewer: null, discrepancy_reason: null}));
      });
      // Deliberately omit entries, historical quantities, ledger balances and session notes.
      return {kind: "UNSIGNED BLIND COUNT SHEET", mode: "preparation_only", session_id: session.id,
        session_name: session.name, revision: session.revision, exported_by: actor,
        exported_at: new Date().toISOString(), opening_balance_posting: "NOT AUTHORIZED",
        instructions: "Unknown is not zero. Record UNKNOWN, MISSING, DISPUTED or VERIFIED separately. MISSING is not an approved zero. Use a fresh sheet for each independent pass; reconcile against the current session revision before entering counts. This export is unsigned and cannot be imported or used to post stock.", rows};
    });
  }
}
