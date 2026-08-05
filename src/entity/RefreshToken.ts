import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from "typeorm";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column("uuid")
  @Index()
  user_id!: string;

  @Column({ type: "varchar", length: 255 })
  token_hash!: string;

  @Column({ type: "timestamp" })
  expires_at!: Date;

  @Column({ type: "boolean", default: false })
  is_revoked!: boolean;

  @CreateDateColumn()
  created_at!: Date;
}
