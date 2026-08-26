import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("floor_plan_layouts")
export class FloorPlanLayout {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  warehouseCode!: string;

  @Column({ type: "jsonb", default: [] })
  elements!: any[];

  @Column({ type: "jsonb", default: [] })
  templates!: any[];

  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
