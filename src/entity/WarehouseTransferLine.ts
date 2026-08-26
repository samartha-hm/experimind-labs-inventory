import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { WarehouseTransfer } from "./WarehouseTransfer";

@Entity("warehouse_transfer_lines")
export class WarehouseTransferLine {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => WarehouseTransfer, (transfer) => transfer.lines, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "transfer_id" })
  transfer!: WarehouseTransfer;

  @Column({ type: "uuid" })
  item_id!: string;

  @Column({ type: "varchar", length: 255 })
  item_name!: string;

  @Column({ type: "varchar", length: 100 })
  item_sku!: string;

  @Column({ type: "numeric", precision: 12, scale: 4 })
  requested_qty!: number;

  @Column({ type: "numeric", precision: 12, scale: 4, default: 0 })
  received_qty!: number;

  @Column({ type: "varchar", length: 100, nullable: true })
  source_bin?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  destination_bin?: string;
}
