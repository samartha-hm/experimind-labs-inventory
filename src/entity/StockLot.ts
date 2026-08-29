import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { InventoryItem } from "./InventoryItem.ts";

export type LotStatus = "RELEASED" | "QUARANTINE" | "EXPIRED" | "REJECTED" | "DEPLETED";

@Entity("stock_lots")
@Unique(["organization_id", "item_id", "lot_number"])
export class StockLot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "uuid" })
  @Index()
  item_id!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "item_id" })
  item!: InventoryItem;

  @Column({ type: "varchar", length: 150 })
  @Index()
  lot_number!: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  supplier_lot_number?: string;

  @Column({ type: "uuid", nullable: true })
  vendor_id?: string;

  @Column({ type: "timestamptz", nullable: true })
  manufacture_date?: Date;

  @Column({ type: "timestamptz", nullable: true })
  @Index()
  expiry_date?: Date;

  @Column({ type: "timestamptz", default: () => "now()" })
  received_date!: Date;

  @Column({
    type: "varchar",
    length: 50,
    default: "RELEASED",
  })
  @Index()
  status!: LotStatus;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  initial_quantity!: number;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  current_quantity!: number;

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0 })
  unit_cost!: number;

  @Column({ type: "text", nullable: true })
  coa_document_url?: string; // Certificate of Analysis (CoA) for regulated GMP materials

  @Column({ type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
