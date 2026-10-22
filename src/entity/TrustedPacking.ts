import { Column, Entity, PrimaryColumn } from "typeorm";
import type { PackingSnapshot } from "../features/packing/packingPlan";
import type { PackingQCInput } from "../services/TrustedPackingService";

abstract class PackingEvidence {
  @PrimaryColumn('uuid') id!: string;
  @Column('uuid') organization_id!: string;
  @Column('uuid') actor_id!: string;
  @Column('varchar',{length:100}) operation_key!: string;
  @Column('timestamptz') created_at!: Date;
}
@Entity('trusted_packing_plans')
export class TrustedPackingPlan extends PackingEvidence {
  @Column('uuid') project_id!: string;
  @Column('uuid') site_id!: string;
  @Column('uuid') approval_id!: string;
  @Column('integer') demand_revision!: number;
  @Column('jsonb') snapshot!: PackingSnapshot;
}
@Entity('trusted_packing_allocations')
export class TrustedPackingAllocation extends PackingEvidence {
  @Column('uuid') plan_id!: string;
  @Column('uuid') package_id!: string;
  @Column('uuid') output_id!: string;
  @Column('uuid') line_id!: string;
  @Column('numeric',{precision:12,scale:4}) quantity!: string;
}
@Entity('trusted_packing_qc')
export class TrustedPackingQC extends PackingEvidence {
  @Column('uuid') plan_id!: string;
  @Column('uuid') package_id!: string;
  @Column('integer') allocation_revision!: number;
  @Column('text') decision!: 'accept'|'reject';
  @Column('jsonb') checks!: PackingQCInput['checks'];
  @Column('text') notes!: string;
}
export const trustedPackingEntities=[TrustedPackingPlan,TrustedPackingAllocation,TrustedPackingQC];
