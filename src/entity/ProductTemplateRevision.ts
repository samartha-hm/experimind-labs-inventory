import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from "typeorm";
import type { KitSubject } from "./ProductTemplateVersion.ts";

@Entity("product_template_revisions")
@Unique(["version_id", "revision"])
export class ProductTemplateRevision {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") version_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("integer") revision!: number;
  @Column({ type: "varchar", length: 200 }) name!: string;
  @Column("text") description!: string;
  @Column({ type: "varchar", length: 100 }) category!: string;
  @Column({ type: "varchar", length: 20 }) status!: string;
  @Column("jsonb") subjects!: KitSubject[];
  @Column("uuid") updated_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
