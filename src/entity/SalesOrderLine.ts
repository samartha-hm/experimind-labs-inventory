import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from "typeorm";
import { SalesOrder } from "./SalesOrder";
import { InventoryItem } from "./InventoryItem";

@Entity("sales_order_lines")
export class SalesOrderLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => SalesOrder, (so) => so.lines)
  @JoinColumn({ name: "so_id" })
  sales_order: SalesOrder;

  @ManyToOne(() => InventoryItem, (i) => i.salesOrderLines)
  @JoinColumn({ name: "inventory_item_id" })
  inventory_item: InventoryItem;

  @Column({ type: "int" })
  qty_ordered: number;

  @Column({ type: "int", default: 0 })
  qty_picked: number;

  @Column({ type: "int", default: 0 })
  qty_shipped: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unit_price: number;
}