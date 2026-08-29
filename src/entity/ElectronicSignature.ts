import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User.ts";

export type SignatureMeaning =
  | "AUTHORED"
  | "REVIEWED"
  | "APPROVED"
  | "QUALITY_RELEASED"
  | "DISPOSITION_APPROVED"
  | "COUNT_VARIANCE_APPROVED"
  | "CAPA_CLOSED"
  | "REJECTED";

@Entity("electronic_signatures")
export class ElectronicSignature {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", default: "00000000-0000-0000-0000-000000000000" })
  @Index()
  organization_id!: string;

  @Column({ type: "uuid" })
  @Index()
  signer_user_id!: string;

  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "signer_user_id" })
  signerUser!: User;

  @Column({ type: "varchar", length: 255 })
  signer_printed_name!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  signer_role_title?: string;

  @Column({ type: "varchar", length: 100 })
  @Index()
  entity_type!: string; // e.g. "PurchaseOrder", "CycleCount", "Capa", "ChangeRequest"

  @Column({ type: "varchar", length: 150 })
  @Index()
  entity_id!: string;

  @Column({ type: "varchar", length: 80 })
  signature_meaning!: SignatureMeaning;

  @Column({ type: "text", nullable: true })
  comments?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  ip_address?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  session_id?: string;

  @Column({ type: "varchar", length: 64 })
  record_hash!: string; // SHA-256 hash of the target record state when signed

  @Column({ type: "varchar", length: 64 })
  signature_digest!: string; // Cryptographic SHA-256 binding (record_hash + signer + timestamp + meaning)

  @Column({ type: "varchar", length: 50, default: "PASSWORD_REAUTH" })
  auth_method!: string;

  @CreateDateColumn({ type: "timestamptz" })
  @Index()
  signed_at!: Date;
}
