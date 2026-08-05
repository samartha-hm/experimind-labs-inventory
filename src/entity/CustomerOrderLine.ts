import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { CustomerOrder } from "./CustomerOrder.ts";

@Entity("customer_order_lines")
export class CustomerOrderLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => CustomerOrder, (order) => order.lines, { onDelete: "CASCADE" })
  @JoinColumn({ name: "order_id" })
  order!: CustomerOrder;

  @Column("uuid")
  inventory_item_id!: string;

  @Column({ type: "varchar" })
  item_name!: string;

  @Column({ type: "int" })
  quantity!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  unit_price!: number;

  @Column({ type: "decimal", precision: 12, scale: 2 })
  line_total!: number;
}
