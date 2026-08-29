import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { InventoryItem } from "./InventoryItem.ts";

export type SerialStatus =
  | "IN_STOCK"
  | "ALLOCATED"
  | "INSTALLED"
  | "IN_TRANSIT"
  | "RMA_RETURNED"
  | "SCRAPPED";

export interface SerialAuditLog {
  timestamp: string;
  action: string;
  status: SerialStatus;
  user?: string;
  location?: string;
  referenceId?: string;
  notes?: string;
}

@Entity("serial_numbers")
export class SerialNumber {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 150 })
  @Index()
  serialNumber!: string;

  @Column({ type: "uuid" })
  @Index()
  inventoryItemId!: string;

  @ManyToOne(() => InventoryItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "inventoryItemId" })
  inventoryItem!: InventoryItem;

  @Column({ type: "varchar", length: 100, nullable: true })
  warehouseId?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  binId?: string;

  @Column({
    type: "varchar",
    length: 50,
    default: "IN_STOCK",
  })
  @Index()
  status!: SerialStatus;

  @Column({ type: "varchar", length: 100, nullable: true })
  batchNumber?: string;

  @Column({ type: "uuid", nullable: true })
  purchaseOrderId?: string;

  @Column({ type: "uuid", nullable: true })
  salesOrderId?: string;

  @Column({ type: "uuid", nullable: true })
  kitId?: string;

  @Column({ type: "numeric", precision: 12, scale: 2, default: 0 })
  unitCost!: number;

  @Column({ type: "timestamptz", nullable: true })
  warrantyExpiry?: Date;

  @Column({ type: "text", nullable: true })
  notes?: string;

  @Column({ type: "jsonb", default: [] })
  history!: SerialAuditLog[];

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organizationId: string = "00000000-0000-0000-0000-000000000000";

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
