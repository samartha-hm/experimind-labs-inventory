import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

/** Activity/material/packing graphs will reference this version's identity. */
@Entity("product_template_versions")
@Unique(["template_id", "version_number"])
export class ProductTemplateVersion {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") template_id!: string;
  @Column("uuid") organization_id!: string;
  @Column({ type: "integer", default: 1 }) version_number!: number;
  @Column({ type: "varchar", length: 20, default: "draft" }) status!: string;
  @Column({ type: "varchar", length: 200 }) name!: string;
  @Column({ type: "text", default: "" }) description!: string;
  @Column({ type: "varchar", length: 100, default: "" }) category!: string;
  @Column({ type: "integer", default: 1 }) revision!: number;
  @Column("uuid") created_by!: string;
  @Column("uuid") updated_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
