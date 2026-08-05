import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { SalesOrder } from "./SalesOrder";

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id: string;

  @Column({ type: "varchar", unique: true })
  customer_code: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  contact_name?: string;

  @Column({ type: "varchar", nullable: true })
  email?: string;

  @Column({ type: "varchar", nullable: true })
  phone?: string;

  @Column({ type: "jsonb", nullable: true })
  billing_address?: any;

  @Column({ type: "jsonb", nullable: true })
  shipping_address?: any;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  credit_limit: number;

  @OneToMany("SalesOrder", "customer")
  salesOrders: SalesOrder[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}