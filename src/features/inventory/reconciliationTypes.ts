export const reconciliationSources = ["inventory_items", "project_stock_reservations", "purchase_requests", "purchase_orders", "production_work_orders", "packing_orders", "delivery_orders"] as const;
export type ReconciliationSource = typeof reconciliationSources[number];
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
}
export interface ReconciliationPreview {
  mode: "read_only";
  source: ReconciliationSource;
  offset: number;
  hasMore: boolean;
  evidenceHash: string;
  records: ReconciliationRecord[];
  effects: { stock: "unchanged"; commitments: "unchanged"; custody: "unchanged"; fulfillment: "unchanged" };
  authorizationRequired: string[];
}
