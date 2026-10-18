import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("commitment_accounts")
export class CommitmentAccount {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") project_id!: string;
  @Column("uuid") site_id!: string;
  @Column("text") obligation!: string;
  @Column("text") dimension!: "material" | "slot";
  @Column("text") item_key!: string;
  @Column("text") unit!: string;
  @Column("jsonb") selector!: Record<string, string>;
}
@Entity("commitment_entitlements")
export class CommitmentEntitlement {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") account_id!: string;
  @Column("uuid") approval_id!: string;
  @Column("integer") revision!: number;
  @Column("numeric") cap!: string;
  @Column("jsonb") provenance!: unknown;
  @Column("timestamptz") created_at!: Date;
}
@Entity("commitment_balances")
export class CommitmentBalance {
  @PrimaryColumn("uuid") account_id!: string;
  @Column("uuid") organization_id!: string;
  @Column({ type: "uuid", nullable: true }) entitlement_id!: string | null;
  @Column("numeric") approved!: string;
  @Column("numeric") fulfilled!: string;
  @Column("numeric") held!: string;
  @Column("bigint") sequence!: string;
}
@Entity("commitment_claims")
export class CommitmentClaim {
  @PrimaryColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") account_id!: string;
  @Column("uuid") root_id!: string;
  @Column({ type: "uuid", nullable: true }) parent_id!: string | null;
  @Column("text") source_kind!: string;
  @Column("text") source_id!: string;
  @Column("text") source_slice!: string;
  @Column("numeric") quantity!: string;
  @Column("numeric") held!: string;
  @Column("numeric") fulfilled!: string;
  @Column("numeric") released!: string;
  @Column("boolean") retired!: boolean;
}
@Entity("commitment_sources")
export class CommitmentSource {
  @PrimaryColumn("uuid") organization_id!: string;
  @PrimaryColumn("text") kind!: string;
  @PrimaryColumn("text") source_id!: string;
  @PrimaryColumn("text") slice!: string;
  @Column("uuid") claim_id!: string;
  @Column("uuid") account_id!: string;
}
@Entity("commitment_events")
export class CommitmentEventRecord {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") account_id!: string;
  @Column("uuid") entitlement_id!: string;
  @Column("uuid") actor_id!: string;
  @Column("varchar", { length: 100 }) key!: string;
  @Column("text") kind!: string;
  @Column("jsonb") payload!: unknown;
  @Column("text") reason!: string;
  @Column("bigint") sequence!: string;
  @Column("numeric") approved_after!: string;
  @Column("numeric") fulfilled_after!: string;
  @Column("numeric") held_after!: string;
  @Column("timestamptz") created_at!: Date;
}
@Entity("commitment_reconciliation_cases")
export class CommitmentReconciliationCase {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") account_id!: string;
  @Column("varchar", { length: 64 }) source_hash!: string;
  @Column("jsonb") evidence!: unknown;
  @Column("boolean") active!: false;
  @Column("timestamptz") created_at!: Date;
}
@Entity("commitment_authorizations")
@Unique(["organization_id", "actor_id", "operation_key"])
export class CommitmentAuthorization {
  @PrimaryColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") actor_id!: string;
  @Column("text") operation_key!: string;
  @Column("text") fingerprint!: string;
  @Column("jsonb") result!: unknown;
  @Column("timestamptz") created_at!: Date;
}
export const commitmentEntities = [CommitmentAccount, CommitmentEntitlement, CommitmentBalance, CommitmentClaim,
  CommitmentSource, CommitmentEventRecord, CommitmentReconciliationCase, CommitmentAuthorization];

/** Isolated D2B1 migration only; not registered in startup synchronization. */
@Entity("commitment_pr_lines")
@Unique(["request_id"])
export class CommitmentPurchaseRequestLine {
  @PrimaryColumn("uuid") line_id!: string;
  @Column("uuid") request_id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") account_id!: string;
  @Column("uuid") entitlement_id!: string;
  @Column("jsonb") frozen_line!: unknown;
  @Column("text") operation_key!: string;
  @Column("timestamptz") created_at!: Date;
}
