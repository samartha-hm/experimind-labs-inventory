import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("physical_racks")
export class PhysicalRack {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  code!: string;

  @Column({ type: "varchar", length: 255 })
  name!: string;

  @Column({ type: "varchar", length: 100, default: "Zone A" })
  zone!: string;

  @Column({ type: "varchar", length: 50, default: "steel_shelf" })
  type!: "steel_shelf" | "plywood_grid" | "cabinet";

  @Column({ type: "varchar", length: 100, default: "WH-MAIN-01" })
  @Index()
  warehouseCode!: string;

  @Column({ type: "jsonb", default: [] })
  shelves!: any[];

  @Column({ type: "jsonb", nullable: true })
  gridConfig?: { rows: number; cols: number };

  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
