import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Invoice } from "./Invoice.ts";

@Entity("invoice_lines")
export class InvoiceLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => Invoice, (inv) => inv.lines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "invoice_id" })
  invoice!: Invoice;

  @Column({ type: "varchar", nullable: true })
  hsn_code?: string;

  @Column({ type: "varchar" })
  item_name!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unit_price!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  taxable_value!: number;

  @Column({ type: "decimal", precision: 5, scale: 2, default: 18.0 })
  gst_rate_pct!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  cgst_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  sgst_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2, default: 0 })
  igst_amount!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  line_total!: number;
}
