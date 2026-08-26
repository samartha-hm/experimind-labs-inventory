import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { CycleCountLine } from "./CycleCountLine";

export type CycleCountStatus = "draft" | "in_progress" | "pending_review" | "approved_posted" | "cancelled";

@Entity("cycle_counts")
@Index(["organization_id", "status"])
export class CycleCount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  audit_number!: string; // e.g. CC-2026-001

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  warehouse_code?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  target_zone_or_category?: string;

  @Column({ type: "varchar", length: 50, default: "draft" })
  status!: CycleCountStatus;

  @Column({ type: "boolean", default: true })
  is_blind_count!: boolean; // Hide system on-hand from operator during physical count

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0.0 })
  total_variance_value!: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  assigned_auditor_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approved_by_name?: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  completed_at?: Date;

  @Column({ type: "varchar", length: 1000, nullable: true })
  notes?: string;

  @OneToMany(() => CycleCountLine, (line) => line.cycleCount, {
    cascade: true,
    eager: true,
  })
  lines!: CycleCountLine[];

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;
}
