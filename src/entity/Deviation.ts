import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type DeviationSeverity = "CRITICAL" | "MAJOR" | "MINOR";
export type DeviationStatus = "OPEN" | "UNDER_INVESTIGATION" | "PENDING_DISPOSITION" | "CLOSED";
export type DeviationDisposition = "USE_AS_IS" | "REWORK" | "SCRAP" | "RETURN_TO_VENDOR" | "PENDING";

@Entity("deviations")
export class Deviation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  deviation_number!: string; // e.g. NCR-2026-0001

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 50, default: "MAJOR" })
  severity!: DeviationSeverity;

  @Column({ type: "varchar", length: 50, default: "OPEN" })
  @Index()
  status!: DeviationStatus;

  @Column({ type: "varchar", length: 100, nullable: true })
  source_event_type?: string; // e.g. "INSPECTION_FAILURE", "CYCLE_COUNT_DISCREPANCY", "STORAGE_TEMPERATURE_BREACH"

  @Column({ type: "varchar", length: 150, nullable: true })
  source_reference_id?: string;

  @Column({ type: "uuid", nullable: true })
  item_id?: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  lot_number?: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  affected_quantity!: number;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "text", nullable: true })
  immediate_containment_action?: string;

  @Column({ type: "text", nullable: true })
  root_cause_analysis?: string;

  @Column({ type: "varchar", length: 50, default: "PENDING" })
  disposition!: DeviationDisposition;

  @Column({ type: "text", nullable: true })
  disposition_rationale?: string;

  @Column({ type: "uuid", nullable: true })
  capa_id?: string; // Escalation link to formal CAPA

  @Column({ type: "varchar", length: 255, nullable: true })
  reported_by_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  investigated_by_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approved_by_name?: string;

  @Column({ type: "timestamptz", nullable: true })
  closed_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
