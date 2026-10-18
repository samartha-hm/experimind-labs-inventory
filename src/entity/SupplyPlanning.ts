import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from "typeorm";
export interface SupplyLine {
  id:string; item_id:string; quantity:string; unit:string; canonical_quantity:string; canonical_unit:string;
  conversion_id?:string; conversion_factor?:string; project_id?:string; site_id?:string;
  demand_revision?:number; requirement_approval_id?:string; demand_basis?:unknown; qc_required:boolean; notes:string;
}
@Entity("project_stock_reservations")
@Unique(["id","organization_id"])
export class ProjectStockReservation {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") project_id!:string;
  @Column("uuid") site_id!:string;
  @Column("uuid") item_id!:string;
  @Column({type:"numeric",precision:12,scale:4}) quantity!:string;
  @Column({type:"varchar",length:30}) unit!:string;
  @Column({type:"varchar",length:20,default:"active"}) status!:"active"|"released"|"cancelled"|"fulfilled";
  @Column({type:"int",default:1}) revision!:number;
  @Column("uuid") created_by!:string;
  @Column("uuid") updated_by!:string;
  @Column({type:"text",default:""}) reason!:string;
  @Column({type:"uuid",nullable:true}) fulfillment_ledger_id!:string|null;
  @Column({type:"varchar",length:100,nullable:true}) fulfillment_location!:string|null;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
  @UpdateDateColumn({type:"timestamptz"}) updated_at!:Date;
}
@Entity("purchase_requests")
@Unique(["id","organization_id"])
export class PurchaseRequest {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column({type:"varchar",length:60,unique:true}) pr_number!:string;
  @Column({type:"varchar",length:20,default:"draft"}) status!:"draft"|"reviewed"|"approved"|"ordered"|"cancelled";
  @Column({type:"int",default:1}) revision!:number;
  @Column("jsonb") lines!:SupplyLine[];
  @Column({type:"text",default:""}) notes!:string;
  @Column("uuid") created_by!:string;
  @Column({type:"uuid",nullable:true}) reviewed_by!:string|null;
  @Column({type:"uuid",nullable:true}) approved_by!:string|null;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
  @UpdateDateColumn({type:"timestamptz"}) updated_at!:Date;
}
@Entity("purchase_goods_receipts")
@Unique(["id","organization_id"])
export class PurchaseGoodsReceipt {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") po_id!:string;
  @Column("uuid") line_id!:string;
  @Column("uuid") item_id!:string;
  @Column({type:"numeric",precision:12,scale:4}) quantity!:string;
  @Column({type:"varchar",length:30}) unit!:string;
  @Column({type:"varchar",length:100}) location!:string;
  @Column({type:"varchar",length:20,default:"pending"}) status!:"pending"|"accepted"|"rejected"|"quarantined";
  @Column("jsonb") source!:{quantity:string;unit:string;conversion_id?:string;conversion_factor?:string};
  @Column({type:"int",default:1}) revision!:number;
  @Column("uuid") received_by!:string;
  @Column({type:"uuid",nullable:true}) inspected_by!:string|null;
  @Column({type:"uuid",nullable:true}) ledger_id!:string|null;
  @Column({type:"text",default:""}) reason!:string;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
@Entity("supply_events")
@Unique(["organization_id","kind","record_id","revision"])
export class SupplyEvent {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column({type:"varchar",length:30}) kind!:string;
  @Column("uuid") record_id!:string;
  @Column("int") revision!:number;
  @Column("uuid") actor_id!:string;
  @Column("jsonb") snapshot!:unknown;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
@Entity("supply_operations")
@Unique(["organization_id","key"])
export class SupplyOperation {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column({type:"varchar",length:100}) key!:string;
  @Column({type:"varchar",length:64}) fingerprint!:string;
  @Column("jsonb") result!:unknown;
  @Column("uuid") actor_id!:string;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
export const supplyEntities=[ProjectStockReservation,PurchaseRequest,PurchaseGoodsReceipt,SupplyEvent,SupplyOperation];
