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
  // Null means a preserved legacy order, excluded from verified incoming supply.
  @Column({type:"int",nullable:true}) planning_revision!:number|null;
  @Column({type:"jsonb",nullable:true}) planning_lines!:import("./SupplyPlanning").SupplyLine[]|null;
  @Column({type:"uuid",nullable:true}) purchase_request_id!:string|null;
  @Column({type:"uuid",nullable:true}) reviewed_by!:string|null;
  @Column({type:"uuid",nullable:true}) approved_by!:string|null;
  @Column({type:"uuid",nullable:true}) created_by!:string|null;
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id: string;

  @Column({ type: "varchar", unique: true })
  po_number: string;

  @Column({ type: "uuid", name: "vendor_id" })
  vendor_id: string;

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
