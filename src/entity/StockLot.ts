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

  // ===== Reel Fractionation & MSL Lifecycle Extensions =====
  @Column({ type: "uuid", nullable: true })
  @Index()
  parent_lot_id?: string; // Self-reference for reel fractionation / split pedigree

  @ManyToOne(() => StockLot, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "parent_lot_id" })
  parent_lot?: StockLot;

  @Column({
    type: "varchar",
    length: 50,
    default: "FULL_REEL",
  })
  package_type!: "FULL_REEL" | "CUT_TAPE" | "TUBE_STICK" | "TRAY" | "BULK_BAG" | "SAMPLE_BOX";

  @Column({ type: "int", nullable: true })
  floor_life_seconds_remaining?: number; // MSL countdown timer

  @Column({ type: "timestamptz", nullable: true })
  msl_open_timestamp?: Date;

  @Column({ type: "jsonb", default: () => "'[]'" })
  msl_bake_history!: Array<{
    baked_at: string;
    temperature_c: number;
    duration_hours: number;
    operator_id?: string;
  }>;

  @Column({ type: "varchar", length: 50, nullable: true })
  feeder_slot?: string; // SMT Pick & Place Feeder ID / Slot (e.g. F-01A)

  @Column({ type: "varchar", length: 50, nullable: true })
  reel_diameter?: string; // e.g. 7-inch, 13-inch

  @Column({ type: "varchar", length: 50, nullable: true })
  tape_width?: string; // e.g. 8mm, 12mm, 16mm, 24mm

  @Column({ type: "text", nullable: true })
  notes?: string;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
