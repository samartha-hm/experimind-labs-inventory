import type { PackingSnapshot } from './packingPlan';
import type { DemandLine } from '../projects/planningTypes';
import type { PackingQCInput } from '../../services/TrustedPackingService';
export interface TrustedAllocation {id:string;package_id:string;output_id:string;line_id:string;quantity:string;operation_key:string}
export interface TrustedInspection {id:string;package_id:string;decision:'accept'|'reject';actor_id:string;checks:PackingQCInput['checks'];notes:string;allocation_revision:number;operation_key:string}
export interface TrustedPlan {id:string;organization_id:string;project_id:string;site_id:string;approval_id:string;demand_revision:number;snapshot:PackingSnapshot;allocations:TrustedAllocation[];inspections:TrustedInspection[]}
export interface AvailableOutput {id:string;qr:string;project_id:string;site_id:string;approval_id:string;demand_revision:number;quantity:string;available:string;unit:string;demand_line:DemandLine|{inventory_item_id:string;unit:string;quantity:string;lines:DemandLine[]}}
export function outputMatchesMaterial(output:AvailableOutput,plan:TrustedPlan,pack:PackingSnapshot['packages'][number],line:string):boolean {
  if(output.project_id!==plan.project_id||output.site_id!==plan.site_id||output.approval_id!==plan.approval_id||output.demand_revision!==plan.demand_revision)return false;
  const material=pack.materials.find(m=>m.line_id===line);
  if(!material||output.unit!==material.unit)return false;
  const lines='lines' in output.demand_line?output.demand_line.lines:[output.demand_line];
  return lines.some(d=>d.selection_id===pack.selection_id&&d.version_id===pack.version_id&&d.material_id===line&&d.inventory_item_id===material.item_id&&d.unit===material.unit);
}
export interface TrustedPackingView {enabled:boolean;plans:TrustedPlan[];outputs:AvailableOutput[]}
export function inspectionFor(plan:TrustedPlan,packageId:string):TrustedInspection|undefined {
  const direct=plan.inspections.find(q=>q.package_id===packageId);
  if(direct)return direct;
  const parent=plan.snapshot.packages.find(p=>p.id===packageId)?.parent_id;
  return parent?inspectionFor(plan,parent):undefined;
}
