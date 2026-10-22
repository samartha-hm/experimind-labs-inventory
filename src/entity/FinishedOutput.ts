import { Column, Entity, PrimaryColumn } from "typeorm";

export interface OutputInputEvidence {
  material: string; item: string; quantity: string; unit: string; issues: string[];
}

@Entity("production_output_custody")
export class FinishedOutput {
  @PrimaryColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") order_id!: string;
  @Column("uuid") source_id!: string;
  @Column("numeric", { precision: 12, scale: 4 }) quantity!: string;
  @Column("varchar", { length: 30 }) unit!: string;
  @Column("varchar", { length: 100 }) location!: string;
  @Column("varchar", { length: 30 }) output_type!: "recipe_output";
  @Column("varchar", { length: 30 }) status!: "pending_qc";
  @Column("jsonb") input_basis!: OutputInputEvidence[];
  @Column("uuid") actor_id!: string;
  @Column("varchar", { length: 100 }) operation_key!: string;
  @Column("text") qr!: string;
  @Column("timestamptz") created_at!: Date;
}
