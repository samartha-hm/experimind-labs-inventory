import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type ChangeStatus = "DRAFT" | "SUBMITTED" | "IMPACT_ANALYSIS" | "PENDING_CCB_APPROVAL" | "APPROVED" | "EFFECTIVE" | "REJECTED";

@Entity("change_requests")
export class ChangeRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  eco_number!: string; // e.g. ECO-2026-0001

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 80, default: "BOM_MODIFICATION" })
  change_type!: string; // "BOM_MODIFICATION", "SPECIFICATION_REVISION", "STORAGE_CONDITION_UPDATE"

  @Column({ type: "varchar", length: 50, default: "DRAFT" })
  @Index()
  status!: ChangeStatus;

  @Column({ type: "uuid", nullable: true })
  target_kit_id?: string;

  @Column({ type: "uuid", nullable: true })
  target_item_id?: string;

  @Column({ type: "text" })
  reason_for_change!: string;

  @Column({ type: "text", nullable: true })
  impact_assessment?: string; // Impact on existing inventory, open POs, customer deliveries

  @Column({ type: "jsonb", nullable: true })
  proposed_changes?: any; // Detailed diff of BOM revisions or spec parameters

  @Column({ type: "varchar", length: 255, nullable: true })
  initiator_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  ccb_approver_name?: string; // Change Control Board approver

  @Column({ type: "timestamptz", nullable: true })
  effective_date?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
