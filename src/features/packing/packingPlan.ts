import { randomUUID } from "node:crypto";
import type { KitPackingUnit } from "../../entity/ProductTemplateVersion";
import type { PlanningVersion } from "../projects/requirementPlanning";
import { decimalUnits } from "../projects/requirementPlanning";
import type { PlanningSite, DemandLine } from "../projects/planningTypes";
import { stockText } from "../inventory/physicalQuantity";
import { DraftKitError } from "../../services/ProductTemplateService";

export interface PackMaterial { line_id:string; item_id:string; name:string; unit:string; quantity:string }
export interface PhysicalPackage { id:string; parent_id:string|null; kind:string; name:string; code:string; pack_number:number; selection_id:string; version_id:string; version_number:number; subject:string; grade:string; definition_id:string; activity_ids:string[]; inventory_item_ids:string[]; materials:PackMaterial[] }
export interface PackingSnapshot { project_name:string; site_name:string; packages:PhysicalPackage[]; versions:PlanningVersion[]; lines:DemandLine[] }
/** Physical assignment does not multiply demand. Each demand line is placed exactly once per set. */
export function materializePacking(projectName:string,site:PlanningSite,versions:PlanningVersion[],lines:DemandLine[]):PackingSnapshot {
  const packages:PhysicalPackage[]=[];
  const add=(base:Omit<PhysicalPackage,"id"|"code"|"materials">)=>{if(packages.length>=10000)throw new DraftKitError(400,"Packing plan exceeds 10000 packages; split the allocation");const id=randomUUID();const p:PhysicalPackage={...base,id,code:`PK-${id}`,materials:[]};packages.push(p);return p;};
  const split=(line:DemandLine,targets:PhysicalPackage[])=>{
    if(!line.inventory_item_id||line.quantity===0)return;
    const q=decimalUnits(line.quantity);if(q%100n)throw new DraftKitError(400,"Packing demand requires explicit four-decimal stock precision");
    if(!targets.length)throw new DraftKitError(400,"Material has no physical destination");
    const total=q/100n,n=BigInt(targets.length),per=total/n,remainder=total%n;
    targets.forEach((p,i)=>{const quantity=per+(BigInt(i)<remainder?1n:0n);if(quantity)p.materials.push({line_id:line.material_id!,item_id:line.inventory_item_id!,name:line.owner_name,unit:line.unit,quantity:stockText(quantity)});});
  };
  for(const selection of site.selections){
    const version=versions.find(v=>v.id===selection.version_id);if(!version)throw new DraftKitError(400,"Approved version missing");
    const own=lines.filter(l=>l.selection_id===selection.id);
    const base={selection_id:selection.id,version_id:version.id,version_number:version.version_number,subject:"",grade:"",activity_ids:[],inventory_item_ids:[]};
    const batch=add({...base,parent_id:null,kind:"batch",name:version.name,pack_number:1,definition_id:selection.id});
    const gradeParents=new Map<string,PhysicalPackage[]>(),completeParents=new Map<string,PhysicalPackage[]>();
    // Complete sets are grouped only by an explicitly configured complete-set rule and decision.
    for(const subject of version.subjects)for(const crate of subject.crates??[])if(crate.rule.kind==="complete_sets"){
      const count=selection.context.complete_sets?.[crate.id]??0;const roots:PhysicalPackage[]=[];
      for(let i=0;i<count;i++)roots.push(add({...base,parent_id:batch.id,kind:"kit",name:"Complete set",subject:subject.name,pack_number:i+1,definition_id:crate.id}));
      completeParents.set(crate.id,roots);
      if(count)for(const component of crate.rule.components){if(gradeParents.has(component.grade_id))throw new DraftKitError(400,"Overlapping complete-set groups require separate selections");gradeParents.set(component.grade_id,roots.flatMap(r=>Array.from({length:component.quantity},()=>r)));}
    }
    for(const subject of version.subjects)for(const grade of subject.grades){
      const count=selection.context.grade_quantities[grade.id]??0;const parents=gradeParents.get(grade.id)??[];
      while(parents.length<count)parents.push(add({...base,parent_id:batch.id,kind:"kit",name:`${subject.name} ${grade.name} set`,subject:subject.name,grade:grade.name,pack_number:parents.length+1,definition_id:grade.id}));
      gradeParents.set(grade.id,parents);const physical:PhysicalPackage[][]=[];
      for(let i=0;i<count;i++){
        const s=add({...base,parent_id:parents[i].id,kind:"subject",name:subject.name,subject:subject.name,pack_number:i+1,definition_id:subject.id});
        const g=add({...base,parent_id:s.id,kind:"grade",name:grade.name,subject:subject.name,grade:grade.name,pack_number:i+1,definition_id:grade.id});const group:PhysicalPackage[]=[g];
        const walk=(units:KitPackingUnit[],parent:string)=>{for(const unit of units){const p=add({...base,parent_id:parent,kind:unit.kind,name:unit.name,subject:subject.name,grade:grade.name,pack_number:i+1,definition_id:unit.id,activity_ids:unit.activity_ids,inventory_item_ids:unit.inventory_item_ids});group.push(p);walk(unit.children,p.id);}};
        walk(grade.packing??[],g.id);physical.push(group);
      }
      for(const line of own.filter(l=>l.grade_id===grade.id&&l.source==="activity"&&l.inventory_item_id)){
        const targets=physical.map(group=>group.find(p=>p.kind==="pouch"&&p.activity_ids.includes(line.owner_id)&&p.inventory_item_ids.includes(line.inventory_item_id!))??group.find(p=>p.activity_ids.includes(line.owner_id))??group.find(p=>p.inventory_item_ids.includes(line.inventory_item_id!))??group[0]);
        split(line,targets);
      }
    }
    for(const subject of version.subjects)for(const crate of subject.crates??[]){
      const count=own.find(l=>l.owner_id===crate.id&&!l.material_id)?.quantity??0;
      if(!Number.isSafeInteger(count))throw new DraftKitError(400,"Physical crate count must be an integer");
      const parents=crate.rule.kind==="complete_sets"?completeParents.get(crate.id):crate.rule.kind==="selected_sets"&&crate.rule.components.length===1?gradeParents.get(crate.rule.components[0].grade_id):undefined;
      const group:PhysicalPackage[]=[];for(let i=0;i<count;i++)group.push(add({...base,parent_id:parents?.[i]?.id??batch.id,kind:`${crate.kind}_crate`,name:crate.name,subject:subject.name,pack_number:i+1,definition_id:crate.id}));
      for(const line of own.filter(l=>l.owner_id===crate.id&&l.inventory_item_id))split(line,group);
    }
  }
  return {project_name:projectName,site_name:site.name,packages,versions,lines};
}
