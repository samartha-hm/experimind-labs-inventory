import { trustedPackingEntities } from "./TrustedPacking";
import {Entity,PrimaryGeneratedColumn,Column,CreateDateColumn,UpdateDateColumn} from "typeorm";
import { FinishedOutput } from "./FinishedOutput";
export interface RecipeInput {item_id:string;quantity:string;unit:string;scrap_percent:string;canonical_quantity:string;conversion_id?:string;conversion_factor?:string}
export interface RecipeDefinition {output_item_id:string;yield_quantity:string;unit:string;inputs:RecipeInput[];instructions:string;specification:string;concentration:string}
@Entity("production_recipes")
export class ProductionRecipe {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") family_id!:string;
  @Column("int") version!:number;
  @Column("int",{default:1}) revision!:number;
  @Column("varchar",{length:200}) name!:string;
  @Column("varchar",{length:20,default:"draft"}) status!:"draft"|"approved";
  @Column("jsonb") definition!:RecipeDefinition;
  @Column("uuid") created_by!:string;
  @Column("uuid",{nullable:true}) approved_by!:string|null;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
export interface WorkInput {id:string;item_id:string;unit:string;planned_quantity:string;source:RecipeInput}
@Entity("production_work_orders")
export class ProductionWorkOrder {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("varchar",{length:60}) number!:string;
  @Column("uuid") output_item_id!:string;
  @Column("uuid",{nullable:true}) recipe_id!:string|null;
  @Column("jsonb",{nullable:true}) recipe_snapshot!:RecipeDefinition|null;
  @Column("uuid",{nullable:true}) project_id!:string|null;
  @Column("uuid",{nullable:true}) site_id!:string|null;
  @Column("int",{nullable:true}) demand_revision!:number|null;
  @Column("numeric",{precision:12,scale:4}) planned_quantity!:string;
  @Column("varchar",{length:30}) unit!:string;
  @Column("jsonb") inputs!:WorkInput[];
  @Column("varchar",{length:20,default:"draft"}) status!:"draft"|"released"|"in_progress"|"completed"|"cancelled";
  @Column("int",{default:1}) revision!:number;
  @Column("date",{nullable:true}) due_date!:string|null;
  @Column("varchar",{length:20,default:"normal"}) priority!:"low"|"normal"|"high"|"urgent";
  @Column("uuid",{nullable:true}) assigned_employee_id!:string|null;
  @Column("varchar",{length:200,default:""}) assigned_team!:string;
  @Column("text",{default:""}) instructions!:string;
  @Column("text",{default:""}) reason!:string;
  @Column("uuid") created_by!:string;
  @Column("uuid",{nullable:true}) released_by!:string|null;
  @Column("uuid") updated_by!:string;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
  @UpdateDateColumn({type:"timestamptz"}) updated_at!:Date;
}
@Entity("production_input_reservations")
export class ProductionInputReservation {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") order_id!:string;
  @Column("uuid") line_id!:string;
  @Column("uuid") item_id!:string;
  @Column("numeric",{precision:12,scale:4}) quantity!:string;
  @Column("varchar",{length:30}) unit!:string;
  @Column("varchar",{length:20,default:"active"}) status!:"active"|"consumed"|"released";
  @Column("uuid") created_by!:string;
}
@Entity("production_input_issues")
export class ProductionInputIssue {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") order_id!:string;
  @Column("uuid") reservation_id!:string;
  @Column("uuid") item_id!:string;
  @Column("numeric",{precision:12,scale:4}) quantity!:string;
  @Column("numeric",{precision:12,scale:4,default:0}) scrap_quantity!:string;
  @Column("varchar",{length:30}) unit!:string;
  @Column("varchar",{length:100}) location!:string;
  @Column("text") reason!:string;
  @Column("uuid") issued_by!:string;
  @Column("uuid") ledger_id!:string;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
@Entity("production_batches")
export class ProductionBatch {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") order_id!:string;
  @Column("varchar",{length:100}) batch_code!:string;
  @Column("numeric",{precision:12,scale:4}) quantity!:string;
  @Column("numeric",{precision:12,scale:4,default:0}) accepted!:string;
  @Column("numeric",{precision:12,scale:4,default:0}) rejected!:string;
  @Column("numeric",{precision:12,scale:4,default:0}) rework!:string;
  @Column("varchar",{length:100}) location!:string;
  @Column("text",{default:""}) notes!:string;
  @Column("int",{default:1}) revision!:number;
  @Column("uuid") recorded_by!:string;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
@Entity("production_qc_decisions")
export class ProductionQcDecision {
  @PrimaryGeneratedColumn("uuid") id!:string;
  @Column("uuid") organization_id!:string;
  @Column("uuid") order_id!:string;
  @Column("uuid") batch_id!:string;
  @Column("numeric",{precision:12,scale:4}) quantity!:string;
  @Column("varchar",{length:20}) decision!:"accept"|"reject"|"rework"|"resubmit";
  @Column("text") notes!:string;
  @Column("uuid") inspected_by!:string;
  @Column("uuid",{nullable:true}) ledger_id!:string|null;
  @CreateDateColumn({type:"timestamptz"}) created_at!:Date;
}
export const productionEntities=[ProductionRecipe,ProductionWorkOrder,ProductionInputReservation,ProductionInputIssue,ProductionBatch,ProductionQcDecision,FinishedOutput,...trustedPackingEntities];
