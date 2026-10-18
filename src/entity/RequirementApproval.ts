import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from "typeorm";

@Entity("requirement_approvals")
@Unique(["organization_id", "project_id", "revision"])
export class ProjectRequirementApproval {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") project_id!: string;
  @Column("integer") revision!: number;
  @Column("jsonb") snapshot!: Record<string, unknown>;
  @Column({ type: "varchar", length: 64 }) snapshot_hash!: string;
  @Column("uuid") approved_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) approved_at!: Date;
}
@Entity("requirement_approval_retries")
export class RequirementApprovalRetry {
  @Column({ type: "uuid", primary: true }) organization_id!: string;
  @Column({ type: "uuid", primary: true }) actor_id!: string;
  @Column({ type: "varchar", length: 100, primary: true }) key!: string;
  @Column("uuid") project_id!: string;
  @Column("integer") revision!: number;
  @Column("uuid") approval_id!: string;
}
@Entity("requirement_execution_bindings")
export class RequirementExecutionBinding {
  @Column({ type: "text", primary: true }) kind!: string;
  @Column({ type: "uuid", primary: true }) record_id!: string;
  @Column({ type: "uuid", primary: true }) organization_id!: string;
  @Column("uuid") project_id!: string;
  @Column({ type: "uuid", nullable: true }) site_id!: string | null;
  @Column("integer") revision!: number;
  @Column("uuid") approval_id!: string;
  @CreateDateColumn({ type: "timestamptz" }) bound_at!: Date;
}
export const requirementApprovalEntities = [ProjectRequirementApproval, RequirementApprovalRetry, RequirementExecutionBinding];
