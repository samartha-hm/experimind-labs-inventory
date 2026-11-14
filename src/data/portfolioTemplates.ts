import type { ProjectClassWork } from "./projectsDataset";
import type { TreeNode } from "../services/BomService";

export const portfolioChecks = {
  "Prastuti": ["Grade 8 Science and Math checked", "Grade 9 Science and Math checked", "Grade 10 Science and Math checked", "Science common crates and universal set verified"],
  "Portable STEM Lab (PSL)": ["Rack contents checked", "School installation verified"],
  "Anubhav": ["STEM activity tested", "AI activity tested", "Robotics activity tested"],
  "Geo-Magic": ["Geometry activities checked", "QR tutorial opened and verified"],
  "Shiksha 2.0 Robot": ["Robot serial number", "Installed firmware version", "Motion and sensor test verified"],
} as const;
export type ProductLine = keyof typeof portfolioChecks;

export function catalogClasses(tree: TreeNode[], batch: number): ProjectClassWork[] {
  const classes: ProjectClassWork[] = [];
  function visit(node: TreeNode, factor: number, path: string[]) {
    if (node.doNotPopulate) return;
    const quantity = factor * node.effectiveQuantity;
    if (node.children.length) {
      for (const child of node.children) visit(child, quantity, [...path, node.name]);
      return;
    }
    const name = path.join(" / ") || "Assembly materials";
    let group = classes.find(c => c.name === name);
    if (!group) {
      group = { id: crypto.randomUUID(), name, batchMultiplier: batch, items: [] };
      classes.push(group);
    }
    group.items.push({
      id: crypto.randomUUID(), catalogItemId: node.itemId, classId: group.id, name: node.name,
      category: "HARDWARE_SUPPLIES", specification: node.sku, quantityPerBatchUnit: quantity,
      totalQuantity: batch * quantity, unit: node.unit || "pcs", sourcingChannel: "IN_STOCK", status: "PENDING",
    });
  }
  for (const node of tree) visit(node, 1, []);
  if (!classes.length) throw new Error("Choose a catalog assembly with populated BOM components");
  return classes;
}
