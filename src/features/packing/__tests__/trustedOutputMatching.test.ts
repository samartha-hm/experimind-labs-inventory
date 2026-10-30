import { expect, it } from 'vitest';
import { outputMatchesMaterial, type AvailableOutput, type TrustedPlan } from '../trustedPackingTypes';
import type { PhysicalPackage } from '../packingPlan';
import type { DemandLine } from '../../projects/planningTypes';

const line={selection_id:'selection',version_id:'version',material_id:'material',inventory_item_id:'wire',unit:'m'} as DemandLine;
const pack={selection_id:'selection',version_id:'version',materials:[{line_id:'material',item_id:'wire',unit:'m'}]} as PhysicalPackage;
const plan={project_id:'project',site_id:'school',approval_id:'approval',demand_revision:1} as TrustedPlan;
const output:AvailableOutput={...plan,id:'output',qr:'ERP:OUTPUT:output',quantity:'0.6',available:'0.6',unit:'m',demand_line:line};

it('matches direct and aggregated frozen output lineage without crossing school or approval scope',()=>{
  expect(outputMatchesMaterial(output,plan,pack,'material')).toBe(true);
  const aggregate={...output,demand_line:{inventory_item_id:'wire',unit:'m',quantity:'0.6',lines:[{...line,material_id:'crate'},line]}};
  expect(outputMatchesMaterial(aggregate,plan,pack,'material')).toBe(true);
  for(const changed of [{site_id:'other'},{project_id:'other'},{approval_id:'other'},{demand_revision:2},{unit:'g'}])
    expect(outputMatchesMaterial({...aggregate,...changed},plan,pack,'material')).toBe(false);
  for(const changed of [{selection_id:'other'},{version_id:'other'},{material_id:'other'},{inventory_item_id:'other'},{unit:'g'}])
    expect(outputMatchesMaterial({...output,demand_line:{...line,...changed}},plan,pack,'material')).toBe(false);
  expect(outputMatchesMaterial({...aggregate,demand_line:{...aggregate.demand_line,lines:[]}},plan,pack,'material')).toBe(false);
  expect(outputMatchesMaterial(aggregate,plan,pack,'missing')).toBe(false);
});
