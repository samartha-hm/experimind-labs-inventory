import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { CustomerOrderLine } from "./CustomerOrderLine.ts";

@Entity("customer_orders")
export class CustomerOrder {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", unique: true })
  @Index()
  order_number!: string;

  @Column({ type: "varchar", nullable: true })
  customer_name?: string;

  @Column({ type: "varchar", nullable: true })
  customer_email?: string;

  @Column({ type: "varchar", nullable: true })
  customer_phone?: string;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  total_amount!: number;

  @Column({ type: "varchar", default: "created" })
  status!: "created" | "paid" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";

  @Column({ type: "varchar", nullable: true })
  razorpay_order_id?: string;

  @Column({ type: "varchar", nullable: true })
  razorpay_payment_id?: string;

  @OneToMany("CustomerOrderLine", "order", { cascade: true })
  lines!: CustomerOrderLine[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
