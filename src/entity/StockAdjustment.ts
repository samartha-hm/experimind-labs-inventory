import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("stock_adjustments")
export class StockAdjustment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  @Index()
  organization_id!: string;

  @Column("uuid")
  inventory_item_id!: string;

  @Column({ type: "int" })
  qty_diff!: number; // positive for additions, negative for deductions

  @Column({ type: "varchar", length: 50 })
  reason_code!: "cycle_count" | "damaged" | "expired" | "lost" | "found";

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column("uuid")
  actor_id!: string;

  @CreateDateColumn()
  created_at!: Date;
}
