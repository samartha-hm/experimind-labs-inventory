import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("roles")
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 50 })
  code: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "boolean", default: false })
  is_system: boolean;

  @Column({ type: "varchar", default: "indigo" })
  color: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  permissions: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
