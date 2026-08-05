import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { InvoiceLine } from "./InvoiceLine.ts";

@Entity("invoices")
export class Invoice {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", unique: true })
  @Index()
  invoice_number!: string; // e.g. 'EXP-2026-00001'

  @Column({ type: "date" })
  invoice_date!: Date;

  @Column({ type: "date", nullable: true })
  due_date?: Date;

  @Column("uuid", { nullable: true })
  customer_id?: string;

  @Column("uuid", { nullable: true })
  sales_order_id?: string;

  @Column({ type: "varchar", nullable: true })
  customer_name?: string;

  @Column({ type: "varchar", nullable: true })
  customer_gstin?: string;

  @Column({ type: "varchar", length: 10 })
  place_of_supply!: string; // state code e.g. '29' for KA, '27' for MH

  @Column({ type: "decimal", precision: 12, scale: 2 })
  total_taxable!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  cgst_total!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  sgst_total!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  igst_total!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  grand_total!: number;

  @Column({ type: "varchar", nullable: true })
  irn?: string; // E-Invoice Invoice Reference Number

  @Column({ type: "text", nullable: true })
  signed_qr_code?: string;

  @Column({ type: "varchar", default: "issued" })
  status!: "issued" | "cancelled" | "credit_note_issued";

  @OneToMany("InvoiceLine", "invoice", { cascade: true })
  lines!: InvoiceLine[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}
