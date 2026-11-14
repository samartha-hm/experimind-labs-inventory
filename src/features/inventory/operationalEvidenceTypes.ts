export const evidenceGates = ["stocktake", "variance", "opening", "printer", "scanner", "staff", "recovery", "credentials", "security", "deployment", "pilot"] as const;
export const evidenceDecisions = ["REVIEWED", "REJECTED", "MORE_EVIDENCE", "EXPIRED"] as const;
export interface EvidenceReference { identifier: string; provenance: string; sha256: string }
export interface OperationalCommand {
  stream: string;
  revision: number;
  action: "submit" | "review" | "assign" | "count" | "recount" | "reviewCount";
  data: Record<string, unknown>;
}
export interface OperationalRecord {
  stream_id: string; revision: number; kind: "evidence" | "count";
  actor_id: string; captured_at: string; snapshot: Record<string, unknown>;
}
