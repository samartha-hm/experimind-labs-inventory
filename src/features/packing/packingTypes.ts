import type { PackMaterial, PackingSnapshot } from "./packingPlan";
export const qcChecks=["material","quantity","placement","packaging","stickers","instructions"] as const;
export interface PackageProgress { assembled:boolean; packed_by?:string; packed_at?:string; qc:"pending"|"accepted"|"rejected"; checked_by?:string; checked_at?:string; checks?:Record<typeof qcChecks[number],boolean>; notes?:string }
export interface PackingException { id:string; package_id:string; kind:"missing"|"damaged"|"other"; notes:string; reported_by:string; reported_at:string; corrected_by?:string; corrected_at?:string; correction?:string }
export interface PackingChange { id:string; package_id:string; kind:"additional"|"substitute"; original_item_id?:string; material:PackMaterial; reason:string; approved_by:string; approved_at:string }
export interface PackingExecution { progress:Record<string,PackageProgress>; exceptions:PackingException[]; changes:PackingChange[] }
export interface PackingOrder { id:string; organization_id:string; project_id:string|null; site_id:string|null; demand_revision:number|null; number:string; batch_code:string; snapshot:PackingSnapshot; execution:PackingExecution; status:"draft"|"packing"|"paused"|"ready"|"cancelled"; revision:number; assigned_employee_id:string|null; assigned_team:string; created_by:string; approved_by:string|null; updated_by:string; created_at:string; updated_at:string }
export interface PackingPick { id:string; organization_id:string; order_id:string; item_id:string; quantity:string; unit:string; location:string; ledger_id:string; reservation_id:string|null; source_movements:{id:string;quantity:string}[]; picked_by:string; created_at:string }
export interface PackingMaterialSummary { item_id:string; name:string; unit:string; planned:string; picked:string; assembled:string; checked:string; completed:string; remaining:string; stock_status:"verified"|"unverified"; available:string|null; shortage:string|null }
export interface PackingDetail { order:PackingOrder; picks:PackingPick[]; materials:PackingMaterialSummary[]; history:{actor_id:string;revision:number;created_at:string;snapshot:unknown}[] }
export function actualMaterials(order:PackingOrder,packageId:string):PackMaterial[]{
  let materials=(order.snapshot.packages.find(p=>p.id===packageId)?.materials??[]).map(m=>({...m}));
  for(const c of order.execution.changes.filter(c=>c.package_id===packageId)){
    if(c.kind==="substitute")materials=materials.filter(m=>m.item_id!==c.original_item_id);
    materials.push(c.material);
  }return materials;
}
