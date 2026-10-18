import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";
import type { PlanningContent, PlanningSite } from "../features/projects/planningTypes";
import { requirementApprovalEntities } from "./RequirementApproval";

@Entity("planning_projects")
@Unique(["id", "organization_id"])
export class PlanningProject {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("jsonb") content!: Omit<PlanningContent, "sites">;
  @Column({ type: "integer", default: 1 }) revision!: number;
  @Column("uuid") created_by!: string;
  @Column("uuid") updated_by!: string;
  @Column({ type: "timestamptz", nullable: true }) archived_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
@Entity("planning_sites")
@Unique(["id", "project_id", "organization_id"])
export class PlanningSchoolSite {
  @Column({ type: "uuid", primary: true }) id!: string;
  @Column("uuid") project_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("integer") position!: number;
  @Column("jsonb") content!: PlanningSite;
}
@Entity("planning_version_links")
export class PlanningVersionLink {
  @Column({ type: "uuid", primary: true }) selection_id!: string;
  @Column("uuid") site_id!: string;
  @Column("uuid") project_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") version_id!: string;
}
@Entity("planning_project_revisions")
@Unique(["project_id", "revision"])
export class PlanningProjectRevision {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") project_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("integer") revision!: number;
  @Column("jsonb") content!: PlanningContent;
  @Column("boolean") archived!: boolean;
  @Column("uuid") updated_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
@Entity("kit_template_approvals")
@Unique(["source_version_id", "source_revision"])
export class KitTemplateApproval {
  @Column({ type: "uuid", primary: true }) version_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") source_version_id!: string;
  @Column("integer") source_revision!: number;
  @Column("uuid") approved_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) approved_at!: Date;
}
export const planningEntities = [PlanningProject, PlanningSchoolSite, PlanningVersionLink, PlanningProjectRevision, KitTemplateApproval, ...requirementApprovalEntities];
