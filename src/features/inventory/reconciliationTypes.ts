export const reconciliationSources = ["inventory_items", "project_stock_reservations", "purchase_requests", "purchase_orders", "production_work_orders", "packing_orders", "delivery_orders"] as const;
export type ReconciliationSource = typeof reconciliationSources[number];
export const historicalDecisionStates = ["accepted_for_review", "disputed", "insufficient_evidence", "excluded", "requires_documentation"] as const;
export type HistoricalDecisionState = typeof historicalDecisionStates[number];
export interface EvidenceReference { identifier: string; provenance: string; sha256: string }
export interface HistoricalDecisionInput {
  source: ReconciliationSource; record_id: string; revision: number; evidence_hash: string;
  decision: HistoricalDecisionState; reason: string; evidence_refs: EvidenceReference[];
}
export interface HistoricalDecisionRecord extends HistoricalDecisionInput {
  id: string; organization_id: string; previous_id: string | null; actor_id: string;
  operation_key: string; created_at: string; evidence: Record<string, unknown>;
}
export interface ReconciliationRecord {
  id: string;
  label: string;
  lifecycle: string | null;
  stock: "unknown" | "unreconciled";
  recordedQuantity: string | null;
  verifiedQuantity: null;
  unit: string | null;
  blockers: string[];
  evidenceHash: string;
  evidence: Record<string, unknown>;
  decisions?: HistoricalDecisionRecord[];
}
export interface ReconciliationPreview {
  mode: "read_only";
  source: ReconciliationSource;
  offset: number;
  hasMore: boolean;
  evidenceHash: string;
  records: ReconciliationRecord[];
  decisionsEnabled?: boolean;
  effects: { stock: "unchanged"; commitments: "unchanged"; custody: "unchanged"; fulfillment: "unchanged" };
  authorizationRequired: string[];
}
