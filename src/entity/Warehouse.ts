import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Bin } from "./Bin";
import type { InventoryItem } from "./InventoryItem";

@Entity("warehouses")
export class Warehouse {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", unique: true })
  code: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "jsonb", nullable: true })
  address?: any;

  @Column({ type: "boolean", default: false })
  is_default: boolean;

  @OneToMany("Bin", "warehouse")
  bins: Bin[];

  @OneToMany("InventoryItem", "warehouse")
  inventory: InventoryItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}