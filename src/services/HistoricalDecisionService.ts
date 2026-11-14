import { createHash, randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import { historicalDecisionStates, reconciliationSources, type HistoricalDecisionInput } from "../features/inventory/reconciliationTypes";
import { canonicalRequirementJSON } from "./RequirementApprovalService";
import type { LedgerContext } from "./CommitmentLedgerService";
import { DraftKitError } from "./ProductTemplateService";
import { sqlIdentifier } from "../security/databaseBoundary";

export async function recordHistoricalDecision(m: EntityManager, c: LedgerContext, input: HistoricalDecisionInput, key: string): Promise<Record<string, unknown>> {
  const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
  if (!input || Object.keys(input).sort().join() !== "decision,evidence_hash,evidence_refs,reason,record_id,revision,source"
    || !reconciliationSources.includes(input.source) || !uuid.test(input.record_id)
    || !Number.isSafeInteger(input.revision) || input.revision < 0
    || !/^[a-f0-9]{64}$/.test(input.evidence_hash) || !historicalDecisionStates.includes(input.decision)
    || typeof input.reason !== "string" || !input.reason.trim() || input.reason.length > 2000
    || !Array.isArray(input.evidence_refs) || !input.evidence_refs.length || input.evidence_refs.length > 20
    || input.evidence_refs.some(ref => !ref || Object.keys(ref).sort().join() !== "identifier,provenance,sha256"
      || typeof ref.identifier !== "string" || !ref.identifier.trim() || ref.identifier.length > 300
      || typeof ref.provenance !== "string" || !ref.provenance.trim() || ref.provenance.length > 1000
      || typeof ref.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(ref.sha256)))
    throw new DraftKitError(400, "Valid review decision, explanation and evidence references required");
  const schema = m.connection.options.type === "postgres" ? m.connection.options.schema ?? "public" : "public";
  await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`historical:${c.organization}:${input.source}:${input.record_id}`]);
  const [row] = await m.query(`SELECT to_jsonb(t)||jsonb_build_object('quantity',to_jsonb(t)->>'quantity') evidence
    FROM ${sqlIdentifier(schema)}.${sqlIdentifier(input.source)} t WHERE id=$1 AND organization_id=$2 FOR SHARE`, [input.record_id, c.organization]);
  if (!row) throw new DraftKitError(404, "Historical record unavailable in this organization");
  if (createHash("sha256").update(canonicalRequirementJSON(row.evidence)).digest("hex") !== input.evidence_hash)
    throw new DraftKitError(409, "Source evidence changed; refresh and review again");
  const [previous] = await m.query(`SELECT id,revision FROM trusted_historical_decisions
    WHERE organization_id=$1 AND source=$2 AND record_id=$3 ORDER BY revision DESC LIMIT 1`, [c.organization, input.source, input.record_id]);
  if ((previous?.revision ?? 0) !== input.revision) throw new DraftKitError(409, "A newer review exists; refresh before superseding it");
  const [result] = await m.query(`INSERT INTO trusted_historical_decisions
    (id,organization_id,source,record_id,revision,previous_id,evidence_hash,evidence,decision,reason,evidence_refs,actor_id,operation_key)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12,$13) RETURNING to_jsonb(trusted_historical_decisions) receipt`,
    [randomUUID(), c.organization, input.source, input.record_id, input.revision+1, previous?.id ?? null,
      input.evidence_hash, JSON.stringify(row.evidence), input.decision, input.reason, JSON.stringify(input.evidence_refs), c.actor, key]);
  await m.query(`INSERT INTO audit_logs(id,organization_id,actor_id,action,entity_type,entity_id,"after")
    VALUES($1,$2,$3,'historical_decision','historical_review',$4,$5::jsonb)`,
    [randomUUID(), c.organization, c.actor, result.receipt.id, JSON.stringify(result.receipt)]);
  return result.receipt;
}
