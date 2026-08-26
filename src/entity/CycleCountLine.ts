import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CycleCount } from "./CycleCount";

@Entity("cycle_count_lines")
export class CycleCountLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CycleCount, (cycleCount) => cycleCount.lines, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "cycle_count_id" })
  cycleCount!: CycleCount;

  @Column({ type: "uuid" })
  item_id!: string;

  @Column({ type: "varchar", length: 255 })
  item_name!: string;

  @Column({ type: "varchar", length: 100 })
  item_sku!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  bin_location?: string;

  @Column({ type: "numeric", precision: 12, scale: 4 })
  system_qty!: number;

  @Column({ type: "numeric", precision: 12, scale: 4, nullable: true })
  counted_qty?: number;

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0 })
  variance_qty!: number; // counted_qty - system_qty

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0 })
  unit_cost!: number;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  variance_value!: number; // variance_qty * unit_cost

  @Column({ type: "varchar", length: 255, nullable: true })
  variance_reason?: string;
}
