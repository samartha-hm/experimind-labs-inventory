import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";

export interface StocktakeTarget { item_id: string; locations: string[]; complete_coverage: boolean }
export interface CountEntry {
  id: string; item_id: string; location: string; quantity: string; unit: string;
  counted_by: string; counted_at: string; canonical_quantity?: string; canonical_unit?: string;
  baseline?: string | null; sequence?: number; conversion_id?: string; conversion_factor?: string;
  reviewed_by?: string; approved_by?: string;
}
@Entity("physical_stocktakes")
export class Stocktake {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column({ type: "varchar", length: 200 }) name!: string;
  @Column({ type: "text", default: "" }) notes!: string;
  @Column({ type: "varchar", length: 20, default: "draft" }) status!: "draft" | "reviewed" | "approved" | "posted";
  @Column({ type: "int", default: 1 }) revision!: number;
  @Column({ type: "jsonb" }) targets!: StocktakeTarget[];
  @Column({ type: "jsonb", default: () => "'[]'::jsonb" }) entries!: CountEntry[];
  @Column("uuid") created_by!: string;
  @Column({ type: "uuid", nullable: true }) reviewed_by!: string | null;
  @Column({ type: "uuid", nullable: true }) approved_by!: string | null;
  @Column({ type: "uuid", nullable: true }) posted_by!: string | null;
  @Column({ type: "text", default: "" }) review_reason!: string;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updated_at!: Date;
}
@Entity("physical_stock_scopes")
@Unique(["organization_id", "item_id"])
export class PhysicalStockScope {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") item_id!: string;
  @Column({ type: "varchar", length: 30 }) unit!: string;
  @Column({ type: "jsonb" }) locations!: string[];
  @Column({ type: "boolean" }) complete_coverage!: boolean;
  @Column("uuid") approved_by!: string;
  @Column("uuid") stocktake_id!: string;
}
@Entity("physical_stocktake_events")
export class StocktakeEvent {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") organization_id!: string;
  @Column("uuid") stocktake_id!: string;
  @Column("uuid") actor_id!: string;
  @Column({ type: "int" }) revision!: number;
  @Column({ type: "jsonb" }) snapshot!: Stocktake;
  @CreateDateColumn({ type: "timestamptz" }) created_at!: Date;
}
export const stocktakeEntities = [Stocktake, PhysicalStockScope, StocktakeEvent];
