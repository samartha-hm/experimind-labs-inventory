import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Rma } from "./Rma.ts";
import { InventoryItem } from "./InventoryItem.ts";

export type RmaDisposition = "RESTOCK_TO_GENERAL" | "QUARANTINE_INSPECTION" | "SCRAP_DEFECTIVE" | "RETURN_TO_SUPPLIER" | "PENDING";

@Entity("rma_lines")
export class RmaLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  @Index()
  rma_id!: string;

  @ManyToOne("Rma", "lines", { onDelete: "CASCADE" })
  @JoinColumn({ name: "rma_id" })
  rma!: Rma;

  @Column({ type: "uuid" })
  @Index()
  item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item!: InventoryItem;

  @Column({ type: "varchar", length: 150, nullable: true })
  serial_number?: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  lot_number?: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 1 })
  quantity_returned!: number;

  @Column({ type: "varchar", length: 50, default: "GOOD_ORIGINAL_BOX" })
  condition_grade!: string; // "NEW_UNOPENED", "OPEN_BOX_FUNCTIONAL", "DAMAGED_REQUIRES_REPAIR", "TOTAL_LOSS"

  @Column({ type: "varchar", length: 50, default: "PENDING" })
  disposition!: RmaDisposition;

  @Column({ type: "text", nullable: true })
  inspection_notes?: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
