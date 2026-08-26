import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("custom_element_types")
export class CustomElementType {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  key!: string;

  @Column({ type: "varchar", length: 255 })
  label!: string;

  @Column({ type: "varchar", length: 20, default: "📦" })
  iconEmoji!: string;

  @Column({ type: "varchar", length: 50, default: "#3b82f6" })
  defaultColor!: string;

  @Column({ type: "uuid", nullable: true })
  @Index()
  organizationId?: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
}
