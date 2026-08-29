import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("audit_events")
export class AuditEvent {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "bigint", generated: "increment" })
  @Index()
  sequence_number!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  actor_id!: string;

  @Column({ type: "varchar", length: 255, default: "System" })
  actor_name!: string;

  @Column({ type: "varchar", length: 50, default: "viewer" })
  actor_role!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  session_id?: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address?: string | null;

  @Column({ type: "text", nullable: true })
  user_agent?: string | null;

  @Column({ type: "varchar", length: 80 })
  @Index()
  action!: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  entity_type!: string;

  @Column({ type: "varchar", length: 150 })
  @Index()
  entity_id!: string;

  @Column({ type: "jsonb", nullable: true })
  before_state?: any;

  @Column({ type: "jsonb", nullable: true })
  after_state?: any;

  @Column({ type: "jsonb", nullable: true })
  delta?: any;

  @Column({ type: "text", nullable: true })
  reason_code?: string | null;

  @Column({ type: "varchar", length: 64 })
  @Index()
  previous_hash!: string; // SHA-256 of previous event in the chain

  @Column({ type: "varchar", length: 64 })
  @Index()
  event_hash!: string; // SHA-256 of (previous_hash + actor + action + entity + payload + timestamp)

  @CreateDateColumn({ type: "timestamptz" })
  @Index()
  created_at!: Date;
}
