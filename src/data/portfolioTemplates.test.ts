import { expect, it } from "vitest";
import { catalogClasses, portfolioChecks, type ProductLine } from "./portfolioTemplates";
import type { TreeNode } from "../services/BomService";
import type { Project } from "./projectsDataset";
import { getProjectInventoryShortages, getProjectReadinessSummary } from "../utils/projectReadiness";

function node(name: string, effectiveQuantity: number, children: TreeNode[] = []): TreeNode {
  return {name, effectiveQuantity, children, itemId:name, sku:name, unit:"pcs"} as TreeNode;
}
it.each(Object.keys(portfolioChecks) as ProductLine[])("uses the selected catalog structure and readiness checks for %s", productLine => {
  const classes=catalogClasses([node("Rack",2,[node("Board",3,[node("Sensor",4)])]),node("Extras",1,[node("Sensor",2)])],3);
  expect(classes.map(c=>c.items[0].totalQuantity)).toEqual([72,6]);
  const project={productLine, classes} as Project;
  expect(getProjectInventoryShortages(project,[]).map(s=>s.shortage)).toEqual([72,6]);
  for(const group of classes) group.items[0].status="READY";
  expect(getProjectReadinessSummary(project).readinessPercent).toBeLessThan(100);
  project.readinessEvidence=Object.fromEntries(portfolioChecks[productLine].map(c=>[c,"Verified"]));
  expect(getProjectReadinessSummary(project).readinessPercent).toBe(100);
});
it("rejects an empty assembly and omits do-not-populate branches",()=>{
  expect(()=>catalogClasses([{...node("Excluded",2,[node("Board",1)]),doNotPopulate:true}],2)).toThrow(/populated/);
});
