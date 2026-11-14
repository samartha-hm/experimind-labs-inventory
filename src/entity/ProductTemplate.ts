import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

/** Stable identity; future selections pin a ProductTemplateVersion rather than this row. */
@Entity("product_templates")
@Index(["organization_id", "archived_at"])
export class ProductTemplate {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") created_by!: string;
  @Column({ type: "timestamptz", nullable: true }) archived_at!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
