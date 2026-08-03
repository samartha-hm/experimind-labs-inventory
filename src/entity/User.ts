import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Transaction } from "./Transaction";

@Entity("users")
@Unique(["firebase_uid"])
@Unique(["email"])
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ nullable: true, type: "varchar" })
  firebase_uid: string | null;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "enum", enum: ["admin", "editor", "viewer", "employee"] })
  role: string = "viewer";

  @Column({ type: "varchar", nullable: true })
  password_hash?: string;

  @OneToMany("Transaction", "user")
  transactions: Transaction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}