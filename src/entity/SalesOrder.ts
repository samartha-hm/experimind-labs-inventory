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
import { Customer } from "./Customer";
import type { SalesOrderLine } from "./SalesOrderLine";

@Entity("sales_orders")
export class SalesOrder {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id: string;

  @Column({ type: "varchar", unique: true })
  so_number: string;

  @Column({ type: "uuid", name: "customer_id" })
  customer_id: string;

  @ManyToOne(() => Customer, (c) => c.salesOrders)
  @JoinColumn({ name: "customer_id" })
  customer: Customer;

  @Column({ type: "date" })
  order_date: Date;

  @Column({ type: "date", nullable: true })
  required_date?: Date;

  @Column({
    type: "enum",
    enum: ["draft", "confirmed", "picking", "packed", "shipped", "delivered", "cancelled"],
    default: "draft",
  })
  status: string;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  total_amount: number;

  @OneToMany("SalesOrderLine", "sales_order")
  lines: SalesOrderLine[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}