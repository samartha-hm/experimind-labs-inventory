import type { KitQuantityRule, KitSubject } from "../../entity/ProductTemplateVersion";

export class QuantityRuleError extends Error {}
export interface QuantityOverride { quantity: number; reason: string }
export interface QuantityContext {
  grade_quantities: Record<string, number>;
  complete_sets?: Record<string, number>;
  project_count?: number;
  site_count?: number;
  included_optional?: string[];
  overrides?: Record<string, QuantityOverride>;
}
export interface QuantityLine {
  owner_id: string; owner_name: string; material_id?: string; inventory_item_id?: string;
  unit: string; quantity: number; multiplier: number; basis: string; reusable: boolean;
}
const fail = (message: string): never => { throw new QuantityRuleError(message); };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("Expected a quantity-rule object");
  return value as Record<string, unknown>;
};
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some(key => !allowed.includes(key))) fail("Unknown quantity-rule field");
}
export function count(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000) return fail(`${label} must be an explicit integer from 0 to 1000000`);
  return value;
}
export function amount(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1_000_000_000 || Number(value.toFixed(6)) !== value)
    return fail(`${label} must be a nonnegative quantity with at most six decimal places (maximum 1000000000)`);
  return value;
}
export function validateRule(value: unknown, subjects: KitSubject[]): KitQuantityRule {
  const rule = object(value);
  if (rule.kind === "fixed" || rule.kind === "per_project" || rule.kind === "per_site") {
    keys(rule, ["kind", "quantity"]);
    return { kind: rule.kind, quantity: count(rule.quantity, "Rule quantity") };
  }
  if (rule.kind !== "selected_sets" && rule.kind !== "complete_sets") return fail("Choose a supported quantity rule");
  keys(rule, ["kind", "components"]);
  if (!Array.isArray(rule.components) || !rule.components.length || rule.components.length > 100) return fail("Set rules require 1 to 100 components");
  const seen = new Set<string>();
  const components = rule.components.map(value => {
    const component = object(value); keys(component, ["subject_id", "grade_id", "quantity"]);
    const subject = subjects.find(subject => subject.id === component.subject_id);
    if (!subject?.grades.some(grade => grade.id === component.grade_id)) return fail("Rule components must reference a grade in this template and its owning subject");
    const gradeId = component.grade_id as string;
    if (seen.has(gradeId)) return fail("Rule components must be unique"); seen.add(gradeId);
    const quantity = count(component.quantity, "Component quantity");
    if (!quantity) return fail("Component quantities must be positive");
    return { subject_id: subject.id, grade_id: gradeId, quantity };
  });
  return { kind: rule.kind, components };
}
function multiply(quantity: number, multiplier: number): number {
  const scaled = Math.round(amount(quantity, "Material quantity") * 1e6);
  if (!Number.isSafeInteger(scaled * multiplier)) return fail("Calculated quantity exceeds safe precision");
  return amount(scaled * multiplier / 1e6, "Calculated quantity");
}
/** Pure, typed calculation. Explicit bundle decisions never derive from grade counts. */
export function previewQuantities(subjects: KitSubject[], value: unknown): { lines: QuantityLine[]; totals: { inventory_item_id: string; unit: string; quantity: number }[] } {
  const raw = object(value);
  keys(raw, ["grade_quantities", "complete_sets", "project_count", "site_count", "included_optional", "overrides"]);
  const grades = subjects.flatMap(subject => subject.grades);
  const crates = subjects.flatMap(subject => subject.crates ?? []);
  const materials = [...crates.flatMap(crate => crate.materials), ...grades.flatMap(grade => grade.activities.flatMap(activity => activity.materials))];
  const optionalIds = new Set([...crates, ...materials, ...grades.flatMap(grade => grade.activities)].filter(entry => entry.optional).map(entry => entry.id));
  const overrideIds = new Set([...crates, ...materials].map(entry => entry.id));
  const quantities = object(raw.grade_quantities);
  for (const [id, quantity] of Object.entries(quantities)) { if (!grades.some(grade => grade.id === id)) fail("Unknown selected grade"); count(quantity, "Grade quantity"); }
  const bundles = raw.complete_sets === undefined ? {} : object(raw.complete_sets);
  for (const [id, quantity] of Object.entries(bundles)) { if (!crates.some(crate => crate.id === id && crate.rule.kind === "complete_sets")) fail("Unknown complete-set rule"); count(quantity, "Complete-set count"); }
  for (const scope of ["project_count", "site_count"] as const) if (raw[scope] !== undefined) count(raw[scope], scope);
  const included = raw.included_optional ?? [];
  if (!Array.isArray(included) || included.some(id => typeof id !== "string" || !optionalIds.has(id)) || new Set(included).size !== included.length) fail("Optional selections must reference unique optional definitions");
  const enabled = new Set(included as string[]);
  const overrides = raw.overrides === undefined ? {} : object(raw.overrides);
  for (const [id, value] of Object.entries(overrides)) {
    if (!overrideIds.has(id)) fail("Unknown quantity override");
    const override = object(value); keys(override, ["quantity", "reason"]);
    if (crates.some(crate => crate.id === id)) count(override.quantity, "Crate override"); else amount(override.quantity, "Material override");
    if (typeof override.reason !== "string" || !override.reason.trim() || override.reason.length > 500) fail("Overrides require a reason of 1 to 500 characters");
    if (optionalIds.has(id) && !enabled.has(id)) fail("Include an optional definition before overriding it");
  }
  const lines: QuantityLine[] = [];
  const addMaterials = (owner: { id: string; name: string; materials: typeof materials }, multiplier: number, basis: string, ownerIncluded = true) => {
    for (const material of owner.materials) {
      const active = ownerIncluded && (!material.optional || enabled.has(material.id));
      const override = overrides[material.id] as QuantityOverride | undefined;
      if (override && !active) fail("Include the owning optional definition before overriding its material");
      if (active && (multiplier > 0 || (override?.quantity ?? 0) > 0) && (!material.unit.trim() || material.quantity <= 0 || !material.inventory_item_id)) fail(`Complete the material quantity, inventory item and unit for ${material.item_name}`);
      const quantity = active ? (override?.quantity ?? multiply(material.quantity, multiplier)) : 0;
      lines.push({ owner_id: owner.id, owner_name: owner.name, material_id: material.id, inventory_item_id: material.inventory_item_id,
        unit: material.unit, quantity, multiplier, basis: !active ? "Optional material excluded" : override ? `Explicit final material override: ${override.reason}` : `${basis}; ${material.quantity} × ${multiplier}`, reusable: !!material.reusable });
    }
  };
  for (const subject of subjects) {
    for (const grade of subject.grades) for (const activity of grade.activities) {
      const multiplier = activity.optional && !enabled.has(activity.id) ? 0 : (quantities[grade.id] as number | undefined) ?? 0;
      addMaterials(activity, multiplier, `${subject.name} / ${grade.name} selected sets`, !activity.optional || enabled.has(activity.id));
    }
    for (const crate of subject.crates ?? []) {
      const rule = validateRule(crate.rule, subjects);
      let multiplier = 0;
      let basis: string = rule.kind;
      if (crate.optional && !enabled.has(crate.id)) basis = "Optional crate excluded";
      else if (rule.kind === "selected_sets") {
        for (const component of rule.components) multiplier += multiply(component.quantity, (quantities[component.grade_id] as number | undefined) ?? 0);
        basis = `Selected sets: ${rule.components.map(component => `${component.grade_id}: ${(quantities[component.grade_id] as number | undefined) ?? 0} × ${component.quantity}`).join(" + ")}`;
      } else if (rule.kind === "complete_sets") {
        multiplier = count(bundles[crate.id], `${crate.name} complete-set count`);
        if (rule.components.some(component => multiply(component.quantity, multiplier) > ((quantities[component.grade_id] as number | undefined) ?? 0))) fail(`${crate.name} complete-set count exceeds a selected component quantity`);
        basis = `Explicit complete sets: ${multiplier}; ${rule.components.map(component => `${component.grade_id} × ${component.quantity}`).join(", ")}`;
      } else if (rule.kind === "fixed") { multiplier = rule.quantity; basis = `Fixed crate count: ${rule.quantity}`; }
      else {
        const scopeCount = count(raw[rule.kind === "per_project" ? "project_count" : "site_count"], rule.kind);
        multiplier = multiply(rule.quantity, scopeCount); basis = `${rule.kind}: explicit count ${scopeCount} × ${rule.quantity} crates`;
      }
      const override = overrides[crate.id] as QuantityOverride | undefined;
      if (override) { multiplier = override.quantity; basis += `; explicit crate override: ${override.reason}`; }
      count(multiplier, "Calculated crate count");
      lines.push({ owner_id: crate.id, owner_name: crate.name, unit: "crates", quantity: multiplier, multiplier, basis, reusable: !!crate.reusable });
      addMaterials(crate, multiplier, basis, !crate.optional || enabled.has(crate.id));
    }
  }
  const sums = new Map<string, { inventory_item_id: string; unit: string; quantity: number }>();
  for (const line of lines) if (line.inventory_item_id) {
    const key = JSON.stringify([line.inventory_item_id, line.unit]);
    const current = sums.get(key) ?? { inventory_item_id: line.inventory_item_id, unit: line.unit, quantity: 0 };
    current.quantity = amount((Math.round(current.quantity * 1e6) + Math.round(line.quantity * 1e6)) / 1e6, "Total quantity"); sums.set(key, current);
  }
  return { lines, totals: [...sums.values()].sort((a, b) => a.inventory_item_id.localeCompare(b.inventory_item_id) || a.unit.localeCompare(b.unit)) };
}
