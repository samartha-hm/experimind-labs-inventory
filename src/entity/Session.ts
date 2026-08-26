import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity("sessions")
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  @Index()
  user_id: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id: string;

  @Column({ type: "varchar", length: 255 })
  refresh_token_hash: string;

  @Column({ type: "varchar", length: 255, default: "Unknown Browser" })
  device_info: string;

  @Column({ type: "varchar", length: 100, default: "127.0.0.1" })
  ip_address: string;

  @Column({ type: "varchar", length: 100, default: "Direct Connection" })
  location: string;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  last_active_at: Date;

  @Column({ type: "timestamp" })
  expires_at: Date;

  @Column({ type: "boolean", default: false })
  is_revoked: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
