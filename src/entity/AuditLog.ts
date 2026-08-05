import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("audit_logs")
export class AuditLog {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  @Index()
  organization_id!: string;

  @Column("uuid")
  actor_id!: string;

  @Column({ type: "varchar", length: 50 })
  action!: string; // 'CREATE', 'UPDATE', 'DELETE', 'TRANSFER', 'ADJUST', 'RECEIVE'

  @Column({ type: "varchar", length: 100 })
  entity_type!: string;

  @Column("uuid")
  entity_id!: string;

  @Column("jsonb", { nullable: true })
  before?: object;

  @Column("jsonb", { nullable: true })
  after?: object;

  @CreateDateColumn()
  created_at!: Date;
}
