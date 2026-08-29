import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { InventoryItem } from "./InventoryItem.ts";

export type InspectionStatus = "PENDING_INSPECTION" | "IN_PROGRESS" | "PASSED" | "FAILED" | "CONDITIONALLY_RELEASED";

@Entity("quality_inspections")
export class QualityInspection {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  inspection_number!: string; // e.g. QC-2026-0001

  @Column({ type: "uuid" })
  @Index()
  item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item!: InventoryItem;

  @Column({ type: "varchar", length: 150, nullable: true })
  lot_number?: string;

  @Column({ type: "uuid", nullable: true })
  purchase_order_id?: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  batch_quantity!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  sample_size_inspected!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  defect_count!: number;

  @Column({
    type: "varchar",
    length: 50,
    default: "PENDING_INSPECTION",
  })
  @Index()
  status!: InspectionStatus;

  @Column({ type: "jsonb", default: [] })
  checklist_results!: Array<{
    parameter: string;
    specification: string;
    measured_value: string;
    pass: boolean;
  }>;

  @Column({ type: "varchar", length: 255, nullable: true })
  inspector_name?: string;

  @Column({ type: "uuid", nullable: true })
  inspector_user_id?: string;

  @Column({ type: "text", nullable: true })
  disposition_notes?: string;

  @Column({ type: "uuid", nullable: true })
  deviation_id?: string; // Auto-linked NCR/Deviation if inspection failed

  @Column({ type: "timestamptz", nullable: true })
  inspected_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
