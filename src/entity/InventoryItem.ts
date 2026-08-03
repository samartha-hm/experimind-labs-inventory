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
import { Warehouse } from "./Warehouse";
import type { Bin } from "./Bin";
import type { KitBom } from "./KitBom";
import type { PurchaseOrderLine } from "./PurchaseOrderLine";
import type { SalesOrderLine } from "./SalesOrderLine";
import type { TransactionLine } from "./TransactionLine";

@Entity("inventory_items")
export class InventoryItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  @Index()
  sku: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "varchar", nullable: true })
  category?: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  base_price: number;

  @Column({ type: "int", default: 30 })
  price_markup_pct: number;

  @Column({ type: "int" })
  quantity: number;

  @Column({ type: "varchar", default: "pcs" })
  unit: string;

  @Column({ type: "int" })
  threshold: number;

  @Column({ type: "boolean", default: false })
  is_common: boolean;

  @Column({ type: "boolean", default: false })
  is_subassembly: boolean;

  @Column({ type: "boolean", default: true })
  is_sellable: boolean;

  @Column({ type: "boolean", default: false })
  is_hidden: boolean;

  @Column({ type: "varchar", nullable: true })
  image_url?: string;

  @ManyToOne(() => Warehouse, (w) => w.inventory, { nullable: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse?: Warehouse;

  @ManyToOne("Bin", { nullable: true })
  @JoinColumn({ name: "bin_id" })
  bin?: Bin;

  @Column({ type: "varchar", nullable: true })
  bin_location?: string;

  @Column({ type: "varchar", nullable: true })
  serial_number?: string;

  @Column({ type: "varchar", nullable: true })
  batch_number?: string;

  @Column({ type: "date", nullable: true })
  expiry_date?: Date;

  @OneToMany("KitBom", "inventory_item")
  kitBoms: KitBom[];

  @OneToMany("PurchaseOrderLine", "inventory_item")
  poLines: PurchaseOrderLine[];

  @OneToMany("SalesOrderLine", "inventory_item")
  salesOrderLines: SalesOrderLine[];

  @OneToMany("TransactionLine", "inventory_item")
  transactionLines: TransactionLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}