import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

export type CapaStatus = "INITIATED" | "INVESTIGATION" | "ACTION_PLANNING" | "IMPLEMENTATION" | "EFFECTIVENESS_CHECK" | "CLOSED";

@Entity("capas")
export class Capa {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  capa_number!: string; // e.g. CAPA-2026-0001

  @Column({ type: "varchar", length: 255 })
  title!: string;

  @Column({ type: "varchar", length: 50, default: "INITIATED" })
  @Index()
  status!: CapaStatus;

  @Column({ type: "uuid", nullable: true })
  source_deviation_id?: string;

  @Column({ type: "text" })
  problem_statement!: string;

  @Column({ type: "text", nullable: true })
  five_whys_analysis?: string; // 5-Whys root cause methodology

  @Column({ type: "text", nullable: true })
  root_cause!: string;

  @Column({ type: "jsonb", default: [] })
  corrective_actions!: Array<{
    action_id: string;
    description: string;
    owner_name: string;
    target_date: string;
    completed: boolean;
  }>;

  @Column({ type: "jsonb", default: [] })
  preventive_actions!: Array<{
    action_id: string;
    description: string;
    owner_name: string;
    target_date: string;
    completed: boolean;
  }>;

  @Column({ type: "text", nullable: true })
  effectiveness_criteria?: string;

  @Column({ type: "text", nullable: true })
  effectiveness_verification_results?: string;

  @Column({ type: "boolean", default: false })
  is_effective: boolean = false;

  @Column({ type: "varchar", length: 255, nullable: true })
  lead_investigator_name?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  qa_approver_name?: string;

  @Column({ type: "timestamptz", nullable: true })
  due_date?: Date;

  @Column({ type: "timestamptz", nullable: true })
  closed_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
