import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Warehouse } from "./Warehouse";

@Entity("bins")
export class Bin {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id: string;

  @ManyToOne(() => Warehouse, (w) => w.bins)
  @JoinColumn({ name: "warehouse_id" })
  warehouse: Warehouse;

  @Column({ type: "varchar", unique: true })
  code: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "boolean", default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}