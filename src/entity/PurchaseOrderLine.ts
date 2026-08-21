import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from "typeorm";
import { PurchaseOrder } from "./PurchaseOrder";
import { InventoryItem } from "./InventoryItem";

@Entity("purchase_order_lines")
export class PurchaseOrderLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", name: "po_id" })
  po_id: string;

  @ManyToOne(() => PurchaseOrder, (po) => po.lines)
  @JoinColumn({ name: "po_id" })
  purchase_order: PurchaseOrder;

  @Column({ type: "uuid", name: "inventory_item_id" })
  inventory_item_id: string;

  @ManyToOne(() => InventoryItem, (i) => i.poLines)
  @JoinColumn({ name: "inventory_item_id" })
  inventory_item: InventoryItem;

  @Column({ type: "int" })
  qty_ordered: number;

  @Column({ type: "int", default: 0 })
  qty_received: number;

  @Column({ type: "decimal", precision: 12, scale: 4 })
  unit_cost: number;
}