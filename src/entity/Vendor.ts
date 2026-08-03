import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { PurchaseOrder } from "./PurchaseOrder";

@Entity("vendors")
export class Vendor {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  vendor_code: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  contact_name?: string;

  @Column({ type: "varchar", nullable: true })
  email?: string;

  @Column({ type: "varchar", nullable: true })
  phone?: string;

  @Column({ type: "jsonb", nullable: true })
  address?: any;

  @Column({ type: "varchar", nullable: true })
  payment_terms?: string;

  @OneToMany("PurchaseOrder", "vendor")
  purchaseOrders: PurchaseOrder[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}