import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { BomNode } from "./BomNode.ts";
import { InventoryItem } from "./InventoryItem.ts";

export type AlternateApprovalStatus = "APPROVED" | "UNDER_REVIEW" | "PROHIBITED";

@Entity("component_alternates")
@Index(["bom_node_id", "alternate_item_id"])
export class ComponentAlternate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  bom_node_id!: string;

  @ManyToOne(() => BomNode, (node) => node.alternates, { onDelete: "CASCADE" })
  @JoinColumn({ name: "bom_node_id" })
  bom_node!: BomNode;

  @Column({ type: "uuid" })
  alternate_item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "alternate_item_id" })
  alternate_item!: InventoryItem;

  @Column({ type: "int", default: 1 })
  preference_rank!: number;

  @Column({
    type: "varchar",
    length: 50,
    default: "APPROVED",
  })
  approval_status!: AlternateApprovalStatus;

  @Column({ type: "text", nullable: true })
  engineering_notes?: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
