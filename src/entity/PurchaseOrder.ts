import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Vendor } from "./Vendor";
import type { PurchaseOrderLine } from "./PurchaseOrderLine";

@Entity("purchase_orders")
export class PurchaseOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  po_number: string;

  @ManyToOne(() => Vendor, (v) => v.purchaseOrders)
  @JoinColumn({ name: "vendor_id" })
  vendor: Vendor;

  @Column({ type: "date" })
  order_date: Date;

  @Column({ type: "date", nullable: true })
  expected_date?: Date;

  @Column({
    type: "enum",
    enum: ["draft", "sent", "approved", "received", "cancelled"],
    default: "draft",
  })
  status: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_amount: number;

  @OneToMany("PurchaseOrderLine", "purchase_order")
  lines: PurchaseOrderLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}