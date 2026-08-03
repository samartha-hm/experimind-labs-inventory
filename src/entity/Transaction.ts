import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Column,
  CreateDateColumn,
} from "typeorm";
import { User } from "./User";
import type { TransactionLine } from "./TransactionLine";

@Entity("transactions")
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, (u) => u.transactions, { nullable: true })
  @JoinColumn({ name: "user_id" })
  user?: User;

  @Column({ type: "varchar", length: 20 })
  reference_type: string; // e.g. 'purchase_order', 'sales_order', 'adjustment'

  @Column({ type: "uuid", nullable: true })
  reference_uuid?: string; // FK to the source doc (optional)

  @OneToMany("TransactionLine", "transaction")
  lines: TransactionLine[];

  @CreateDateColumn()
  occurred_at: Date;

  @Column({ type: "varchar", nullable: true })
  notes?: string;
}