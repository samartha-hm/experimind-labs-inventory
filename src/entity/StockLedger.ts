import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

export type StockTransactionType =
  | "PO_RECEIPT"
  | "SO_SHIPMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "MANUAL_ADJUSTMENT"
  | "KIT_CONSUMPTION"
  | "KIT_PRODUCTION"
  | "CYCLE_COUNT_VARIANCE"
  | "INITIAL_BALANCE"
  | "RETURN_RESTOCK";

@Entity("stock_ledger")
@Index(["organization_id", "item_id"])
@Index(["organization_id", "created_at"])
@Index(["bin_location", "organization_id"])
export class StockLedger {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id!: string;

  @Column({ type: "uuid" })
  item_id!: string;

  @Column({ type: "varchar", length: 255 })
  item_name!: string;

  @Column({ type: "varchar", length: 100 })
  item_sku!: string;

  @Column({ type: "uuid", nullable: true })
  warehouse_id?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  bin_location?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  lot_number?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  serial_number?: string;

  @Column({ type: "numeric", precision: 12, scale: 4 })
  qty_delta!: number;

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0.0 })
  unit_cost!: number;

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0.0 })
  running_balance!: number;

  @Column({ type: "varchar", length: 50 })
  transaction_type!: StockTransactionType;

  @Column({ type: "varchar", length: 50, nullable: true })
  reference_type?: string; // 'purchase_order', 'sales_order', 'stock_transfer', 'cycle_count', 'manual'

  @Column({ type: "varchar", length: 100, nullable: true })
  reference_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  reason_code?: string;

  @Column({ type: "varchar", length: 1000, nullable: true })
  notes?: string;

  @Column({ type: "uuid", nullable: true })
  actor_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  actor_name?: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;
}
