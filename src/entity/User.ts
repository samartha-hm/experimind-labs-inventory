import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Transaction } from "./Transaction.ts";

@Entity("users")
@Unique(["firebase_uid"])
@Unique(["email"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ nullable: true, type: "varchar" })
  firebase_uid!: string | null;

  @Column({ type: "varchar" })
  email!: string;

  @Column({ type: "varchar" })
  name!: string;

  @Column({ type: "varchar", default: "viewer" })
  role: string = "viewer";

  @Column({ type: "varchar", nullable: true })
  password_hash?: string;

  @Column({ type: "boolean", default: true })
  is_active: boolean = true;

  @Column({ type: "int", default: 0 })
  failed_login_attempts: number = 0;

  @Column({ type: "timestamp", nullable: true })
  lockout_until?: Date | null;

  @Column({ type: "varchar", nullable: true })
  reset_token_hash?: string | null;

  @Column({ type: "timestamp", nullable: true })
  reset_token_expires?: Date | null;

  @OneToMany("Transaction", "user")
  transactions!: Transaction[];

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}