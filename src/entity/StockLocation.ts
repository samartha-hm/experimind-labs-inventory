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

@Entity("stock_locations")
@Unique(["organization_id", "item_id", "warehouse_id", "bin_id"])
export class StockLocation {
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

  @Column({ type: "varchar", length: 100 })
  @Index()
  warehouse_id!: string;

  @Column({ type: "varchar", length: 100, default: "GENERAL" })
  @Index()
  bin_id!: string;

  @Column({ type: "varchar", length: 100, default: "Zone A" })
  zone!: string;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  quantity!: number;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  allocated_qty!: number;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  reserved_qty!: number;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  quarantine_qty!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
