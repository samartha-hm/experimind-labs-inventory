import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from "typeorm";
import { StockLot } from "./StockLot.ts";

@Entity("stock_by_lot")
@Unique(["organization_id", "lot_id", "warehouse_id", "bin_id"])
export class StockByLot {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "uuid" })
  @Index()
  lot_id!: string;

  @ManyToOne(() => StockLot, { onDelete: "CASCADE" })
  @JoinColumn({ name: "lot_id" })
  lot!: StockLot;

  @Column({ type: "varchar", length: 100 })
  @Index()
  warehouse_id!: string;

  @Column({ type: "varchar", length: 100, default: "GENERAL" })
  @Index()
  bin_id!: string;

  @Column({ type: "numeric", precision: 14, scale: 4, default: 0 })
  quantity!: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
