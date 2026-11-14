import { Column, Entity, PrimaryColumn } from "typeorm";
import type { EvidenceReference, HistoricalDecisionState, ReconciliationSource } from "../features/inventory/reconciliationTypes";

@Entity("trusted_historical_decisions")
export class HistoricalDecision {
  @PrimaryColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("text") source!: ReconciliationSource;
  @Column("uuid") record_id!: string;
  @Column("integer") revision!: number;
  @Column("uuid", { nullable: true }) previous_id!: string | null;
  @Column("text") evidence_hash!: string;
  @Column("jsonb") evidence!: Record<string, unknown>;
  @Column("text") decision!: HistoricalDecisionState;
  @Column("text") reason!: string;
  @Column("jsonb") evidence_refs!: EvidenceReference[];
  @Column("uuid") actor_id!: string;
  @Column("varchar", { length: 100 }) operation_key!: string;
  @Column("timestamptz") created_at!: Date;
}
