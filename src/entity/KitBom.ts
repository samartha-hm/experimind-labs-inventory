import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from "typeorm";
import { Kit } from "./Kit";
import { InventoryItem } from "./InventoryItem";

@Entity("kit_bom")
export class KitBom {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Kit, (k) => k.boms)
  @JoinColumn({ name: "kit_id" })
  kit: Kit;

  @ManyToOne(() => InventoryItem, (i) => i.kitBoms)
  @JoinColumn({ name: "inventory_item_id" })
  inventory_item: InventoryItem;

  @Column({ type: "int" })
  qty_per_kit: number;
}