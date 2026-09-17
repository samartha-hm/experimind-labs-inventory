import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { InventoryItem } from "./InventoryItem.ts";
import { ComponentAlternate } from "./ComponentAlternate.ts";

export type AssemblyPhase =
  | "SMT_TOP"
  | "SMT_BOTTOM"
  | "THT"
  | "MANUAL_ASSEMBLY"
  | "FINAL_PACKAGING"
  | "TEST_FLASH";

@Entity("bom_nodes")
@Index(["organization_id", "parent_item_id"])
@Index(["organization_id", "child_item_id"])
export class BomNode {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "uuid" })
  parent_item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "parent_item_id" })
  parent_item!: InventoryItem;

  @Column({ type: "uuid" })
  child_item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "child_item_id" })
  child_item!: InventoryItem;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 1 })
  quantity!: number;

  @Column({ type: "numeric", precision: 5, scale: 2, default: 0 })
  scrap_percentage!: number;

  @Column({ type: "text", array: true, default: "{}" })
  reference_designators!: string[];

  @Column({ type: "int", nullable: true })
  find_number?: number;

  @Column({
    type: "varchar",
    length: 50,
    default: "SMT_TOP",
  })
  assembly_phase!: AssemblyPhase;

  @Column({ type: "boolean", default: false })
  do_not_populate!: boolean;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @OneToMany(() => ComponentAlternate, (alt) => alt.bom_node, { cascade: true })
  alternates!: ComponentAlternate[];

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
