import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from "typeorm";
import { WarehouseTransferLine } from "./WarehouseTransferLine";

export type TransferStatus = "draft" | "in_transit" | "received" | "cancelled";

@Entity("warehouse_transfers")
@Index(["organization_id", "status"])
export class WarehouseTransfer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  organization_id!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  transfer_number!: string; // e.g. TR-2026-001

  @Column({ type: "varchar", length: 100 })
  source_warehouse_code!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  source_bin!: string;

  @Column({ type: "varchar", length: 100 })
  destination_warehouse_code!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  destination_bin!: string;

  @Column({ type: "varchar", length: 50, default: "draft" })
  status!: TransferStatus;

  @Column({ type: "varchar", length: 255, nullable: true })
  carrier?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  tracking_number?: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  dispatched_at?: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  received_at?: Date;

  @Column({ type: "varchar", length: 1000, nullable: true })
  notes?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  created_by_name?: string;

  @OneToMany(() => WarehouseTransferLine, (line) => line.transfer, {
    cascade: true,
    eager: true,
  })
  lines!: WarehouseTransferLine[];

  @CreateDateColumn({ type: "timestamp with time zone" })
  created_at!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updated_at!: Date;
}
