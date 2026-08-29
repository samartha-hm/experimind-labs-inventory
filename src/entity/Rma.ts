import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from "typeorm";
import type { RmaLine } from "./RmaLine.ts";

export type RmaStatus = "REQUESTED" | "APPROVED" | "GOODS_RECEIVED" | "INSPECTED" | "COMPLETED" | "REJECTED";

@Entity("rmas")
export class Rma {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 50, unique: true })
  @Index()
  rma_number!: string; // e.g. RMA-2026-0001

  @Column({ type: "uuid", nullable: true })
  customer_id?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  customer_name?: string;

  @Column({ type: "uuid", nullable: true })
  sales_order_id?: string;

  @Column({ type: "varchar", length: 50, default: "REQUESTED" })
  @Index()
  status!: RmaStatus;

  @Column({ type: "text" })
  reason_for_return!: string;

  @Column({ type: "text", nullable: true })
  customer_notes?: string;

  @Column({ type: "text", nullable: true })
  internal_notes?: string;

  @OneToMany("RmaLine", "rma", { cascade: true })
  lines!: RmaLine[];

  @Column({ type: "timestamptz", nullable: true })
  received_at?: Date;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
