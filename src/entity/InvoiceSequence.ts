import { Entity, PrimaryColumn, Column } from "typeorm";

@Entity("invoice_sequences")
export class InvoiceSequence {
  @PrimaryColumn("uuid")
  organization_id!: string;

  @PrimaryColumn({ type: "varchar", length: 9 })
  financial_year!: string; // e.g. '2026-2027'

  @Column({ type: "int", default: 0 })
  last_number!: number;
}
