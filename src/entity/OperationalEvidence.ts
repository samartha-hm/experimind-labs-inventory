import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from "typeorm";

/** Append-only snapshots; the highest revision is a projection, never an editable row. */
@Entity("operational_evidence_events")
@Unique(["organization_id", "stream_id", "revision"])
@Unique(["organization_id", "actor_id", "operation_key"])
export class OperationalEvidenceEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") stream_id!: string;
  @Column("uuid") actor_id!: string;
  @Column("int") revision!: number;
  @Column("text") kind!: "evidence" | "count";
  @Column("text") operation_key!: string;
  @Column("text") fingerprint!: string;
  @Column("jsonb") snapshot!: Record<string, unknown>;
  @CreateDateColumn({type: "timestamptz"}) captured_at!: Date;
}
