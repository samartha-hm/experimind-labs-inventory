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
import { InventoryItem } from "./InventoryItem.ts";

@Entity("uom_conversions")
@Unique(["organization_id", "item_id", "from_uom", "to_uom"])
export class UomConversion {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  item_id?: string | null; // Null means global conversion (e.g. 1 kg = 1000 g)

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE", nullable: true })
  @JoinColumn({ name: "item_id" })
  item?: InventoryItem | null;

  @Column({ type: "varchar", length: 30 })
  from_uom!: string; // e.g. "CASE", "BOX", "KG"

  @Column({ type: "varchar", length: 30 })
  to_uom!: string; // e.g. "EACH", "MG"

  @Column({ type: "numeric", precision: 14, scale: 6 })
  conversion_factor!: number; // e.g. 1 CASE = 12 EACH -> factor = 12

  @Column({ type: "boolean", default: true })
  is_active: boolean = true;

  @CreateDateColumn({ type: "timestamptz" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at!: Date;
}
