import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

/** Editable, version-owned subject/grade/activity structure; identifiers are stable across revisions.
 *  Materials reference existing inventory master items; `complete` is computed server-side on save. */
export interface KitMaterial {
  id: string;
  inventory_item_id: string;
  item_name: string;
  quantity: number;
  unit: string;
  notes?: string;
  optional?: boolean;
  reusable?: boolean;
  complete?: boolean;
}
export interface KitActivity {
  id: string;
  code?: string;
  name: string;
  description?: string;
  instructions?: string;
  reference_url?: string;
  optional?: boolean;
  materials: KitMaterial[];
}
export interface KitPackingUnit {
  id: string;
  kind: "box" | "partition" | "pouch";
  name: string;
  code?: string;
  notes?: string;
  activity_ids: string[];
  inventory_item_ids: string[];
  inventory_labels?: Record<string, string>;
  children: KitPackingUnit[];
}
export interface KitGrade { id: string; name: string; activities: KitActivity[]; packing?: KitPackingUnit[] }
export interface KitSetReference { subject_id: string; grade_id: string; quantity: number }
export type KitQuantityRule =
  | { kind: "selected_sets"; components: KitSetReference[] }
  | { kind: "complete_sets"; components: KitSetReference[] }
  | { kind: "fixed"; quantity: number }
  | { kind: "per_project" | "per_site"; quantity: number };
export interface KitCrate {
  id: string; name: string; kind: "common" | "universal" | "custom";
  notes?: string; optional?: boolean; reusable?: boolean;
  materials: KitMaterial[]; rule: KitQuantityRule;
}
export interface KitSubject { id: string; name: string; grades: KitGrade[]; crates?: KitCrate[] }

/** Activity/material/packing graphs will reference this version's identity. */
@Entity("product_template_versions")
@Unique(["template_id", "version_number"])
@Unique(["id", "organization_id"])
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
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) subjects!: KitSubject[];
  @Column("uuid") created_by!: string;
  @Column("uuid") updated_by!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
