import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Column,
} from "typeorm";
import { Transaction } from "./Transaction";
import { InventoryItem } from "./InventoryItem";

@Entity("transaction_lines")
export class TransactionLine {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Transaction, (t) => t.lines)
  @JoinColumn({ name: "transaction_id" })
  transaction: Transaction;

  @ManyToOne(() => InventoryItem, (i) => i.transactionLines)
  @JoinColumn({ name: "inventory_item_id" })
  inventory_item: InventoryItem;

  @Column({ type: "int" })
  quantity_change: number; // + for IN, - for OUT

  @Column({ type: "decimal", precision: 12, scale: 4 })
  unit_cost: number;
}