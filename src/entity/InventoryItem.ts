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
import { Organization } from "./Organization";
import type { Bin } from "./Bin";
import type { KitBom } from "./KitBom";
import type { PurchaseOrderLine } from "./PurchaseOrderLine";
import type { SalesOrderLine } from "./SalesOrderLine";
import type { TransactionLine } from "./TransactionLine";

@Entity("inventory_items")
export class InventoryItem {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id: string;

  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: "organization_id" })
  organization?: Organization;

  @Column({ type: "varchar" })
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

  @Column({ type: "int", default: 0 })
  reserved_quantity: number;

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

  @Column({ type: "uuid", name: "warehouse_id", nullable: true })
  warehouse_id?: string;

  @ManyToOne(() => Warehouse, (w) => w.inventory, { nullable: true })
  @JoinColumn({ name: "warehouse_id" })
  warehouse?: Warehouse;

  @Column({ type: "uuid", name: "bin_id", nullable: true })
  bin_id?: string;

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

  // ===== Hardware & Electronics Lab Extensions =====
  @Column({ type: "varchar", length: 150, nullable: true })
  @Index()
  mpn?: string; // Manufacturer Part Number (e.g. ESP32-WROOM-32E, STM32F401RET6)

  @Column({ type: "varchar", length: 150, nullable: true })
  manufacturer?: string; // e.g. Espressif, STMicroelectronics, Texas Instruments

  @Column({ type: "varchar", length: 100, nullable: true })
  @Index()
  package_footprint?: string; // e.g. 0402, 0603, 0805, QFN-32, SOIC-8, DIP-8, SOT-23

  @Column({ type: "varchar", length: 50, default: "SMD" })
  mounting_type?: string; // SMD, THT, CHASSIS, PANEL, OTHER

  @Column({ type: "varchar", length: 20, default: "MSL 1" })
  msl_rating?: string; // MSL 1, MSL 2, MSL 2a, MSL 3, MSL 4, MSL 5, MSL 5a, MSL 6

  @Column({ type: "jsonb", default: () => "'{}'" })
  parametric_specs?: Record<string, any>; // { resistance: "10k", tolerance: "1%", voltage: "50V", ... }

  @Column({ type: "text", nullable: true })
  datasheet_url?: string;

  @Column({ type: "text", nullable: true })
  pinout_diagram_url?: string;

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