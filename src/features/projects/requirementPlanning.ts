import type { KitPackingUnit, KitSubject } from "../../entity/ProductTemplateVersion";
import { amount, previewQuantities, QuantityRuleError } from "../kit-builder/quantityRules";
import type { DemandLine, MaterialSummary, PlanningContent, PlanningPreview } from "./planningTypes";

export interface PlanningVersion { id: string; name: string; version_number: number; subjects: KitSubject[] }
export interface PlanningItem { id: string; name: string; unit: string }
export interface PlanningConversion { id: string; item_id?: string | null; from_uom: string; to_uom: string; conversion_factor: number | string }
const scale = 1_000_000n;
export function decimalUnits(value: number): bigint { amount(value, "Demand"); return BigInt(Math.round(value * 1e6)); }
export function decimalNumber(value: bigint): number {
  if (value < 0n || value > 1_000_000_000n * scale) throw new QuantityRuleError("Demand exceeds supported precision/range");
  return amount(Number(value) / 1e6, "Demand");
}
/** No implicit aliases, reciprocals or chains. Only an explicit active one-hop conversion. */
export function convertDemand(quantity: number, factor: number | string): number {
  const text = String(factor);
  if (!/^\d+(\.\d{1,6})?$/.test(text)) throw new QuantityRuleError("Invalid unit conversion factor");
  const [whole, fraction = ""] = text.split(".");
  const scaledFactor = BigInt(whole) * scale + BigInt(fraction.padEnd(6, "0"));
  if (!scaledFactor) throw new QuantityRuleError("Unit conversion factor must be positive");
  const product = decimalUnits(quantity) * scaledFactor;
  if (product % scale) throw new QuantityRuleError("Unit conversion exceeds six-decimal precision");
  return decimalNumber(product / scale);
}
export function calculateRequirements(projectId: string, revision: number, content: PlanningContent,
  versions: PlanningVersion[], items: PlanningItem[], conversions: PlanningConversion[]): PlanningPreview {
  const result: PlanningPreview = { project_id: projectId, revision, operational_release: false, lines: [], packing_assignments: [], materials: [], warnings: [] };
  const warnings = new Set<string>(["Stock NOT VERIFIED: on-hand, reservations, available-to-promise, incoming and shortages are unknown. Physical stocktake or authorized opening balances are required.",
    "Planning only: operational release is disabled. Packing item references are assignments, not additional material quantities. Reusable flags do not imply an unapproved sharing allocation."]);
  const versionMap = new Map(versions.map(v => [v.id, v]));
  const itemMap = new Map(items.map(i => [i.id, i]));
  const projectCounts = new Map<string, number>();
  const scopedAllocations = new Set<string>();
  const totals = new Map<string, MaterialSummary>();
  for (const site of content.sites) for (const selection of site.selections) {
    const version = versionMap.get(selection.version_id);
    if (!version) throw new QuantityRuleError("Select an approved version from your organization");
    // Validate project defaults independently: a site override must not hide an invalid default.
    if (content.overrides[version.id]) previewQuantities(version.subjects, { ...selection.context, overrides: content.overrides[version.id] });
    const context = { ...selection.context, overrides: { ...(content.overrides[version.id] ?? {}), ...(selection.context.overrides ?? {}) } };
    // Per-project definitions have one explicitly assigned destination across this version's selections.
    if (version.subjects.some(s => s.crates?.some(c => c.rule.kind === "per_project"))) {
      const count = context.project_count ?? 0;
      const sum = (projectCounts.get(version.id) ?? 0) + count;
      if (sum > 1) throw new QuantityRuleError("Allocate per-project crates to one site only (project count 0 or 1)");
      projectCounts.set(version.id, sum);
    }
    if ((context.site_count ?? 0) > 1) throw new QuantityRuleError("A site selection can have site count 0 or 1");
    const preview = previewQuantities(version.subjects, context);
    for (const subject of version.subjects) for (const crate of subject.crates ?? []) {
      if (crate.rule.kind !== "per_project" && crate.rule.kind !== "per_site") continue;
      if (!preview.lines.some(l => l.owner_id === crate.id && !l.material_id && l.quantity > 0)) continue;
      const key = JSON.stringify([version.id, crate.id, crate.rule.kind === "per_site" ? site.id : "project"]);
      if (scopedAllocations.has(key)) throw new QuantityRuleError("A shared project/site crate must have one explicit allocation; overrides cannot duplicate it");
      scopedAllocations.add(key);
    }
    const sources = new Map<string, { subject_id: string; subject_name: string; grade_id?: string; grade_name?: string; source: "activity" | "crate" }>();
    for (const subject of version.subjects) {
      for (const crate of subject.crates ?? []) sources.set(crate.id, { subject_id: subject.id, subject_name: subject.name, source: "crate" });
      for (const grade of subject.grades) {
        for (const activity of grade.activities) sources.set(activity.id, { subject_id: subject.id, subject_name: subject.name, grade_id: grade.id, grade_name: grade.name, source: "activity" });
        const packing = (units: KitPackingUnit[]) => { for (const unit of units) {
          if ((context.grade_quantities[grade.id] ?? 0) > 0) result.packing_assignments.push({ site_id: site.id, selection_id: selection.id,
            version_id: version.id, subject_id: subject.id, grade_id: grade.id, packing_id: unit.id,
            name: unit.name, kind: unit.kind, activity_ids: unit.activity_ids, inventory_item_ids: unit.inventory_item_ids, demand: false });
          packing(unit.children);
        } };
        packing(grade.packing ?? []);
      }
    }
    for (const original of preview.lines) {
      const overrideId = original.material_id && context.overrides[original.material_id] ? original.material_id : original.owner_id;
      const override = context.overrides[overrideId];
      const line: DemandLine = { ...original, ...sources.get(original.owner_id)!, project_id: projectId, site_id: site.id,
        site_name: site.name, selection_id: selection.id, version_id: version.id, version_number: version.version_number,
        template_name: version.name, source_unit: original.unit, source_quantity: original.quantity,
        ...(override ? { override, override_scope: selection.context.overrides?.[overrideId] ? "site" : "project" } : {}) };
      if (line.inventory_item_id && line.quantity > 0) {
        const item = itemMap.get(line.inventory_item_id);
        if (!item) warnings.add(`Inventory item unavailable: ${line.inventory_item_id}`);
        else if (!line.unit.trim() || !item.unit?.trim()) warnings.add(`Missing unit: ${item.name}. Demand cannot be compared to stock.`);
        else if (line.unit !== item.unit) {
          const matches = conversions.filter(c => c.from_uom === line.unit && c.to_uom === item.unit && (!c.item_id || c.item_id === item.id));
          const specific = matches.filter(c => c.item_id === item.id);
          const chosen = specific.length ? specific : matches;
          if (chosen.length === 1) {
            try { line.quantity = convertDemand(line.quantity, chosen[0].conversion_factor); line.unit = item.unit; line.conversion_id = chosen[0].id; line.conversion_factor = String(chosen[0].conversion_factor); }
            catch (error) { if (!(error instanceof QuantityRuleError)) throw error; warnings.add(`${item.name}: ${error.message}; units kept separate.`); }
          } else warnings.add(`Incompatible/ambiguous units: ${item.name} ${line.unit} → ${item.unit}; units kept separate.`);
        }
        const key = JSON.stringify([line.inventory_item_id, line.unit]);
        const current = totals.get(key) ?? { inventory_item_id: line.inventory_item_id, name: item?.name ?? line.inventory_item_id,
          unit: line.unit, gross_demand: 0, stock_status: "unverified" as const, verified_on_hand: null, active_reservations: null,
          available_to_promise: null, incoming: null, immediate_shortage: null, projected_shortage: null };
        current.gross_demand = decimalNumber(decimalUnits(current.gross_demand) + decimalUnits(line.quantity));
        totals.set(key, current);
      }
      result.lines.push(line);
    }
  }
  result.materials = [...totals.values()].sort((a, b) => a.inventory_item_id.localeCompare(b.inventory_item_id) || a.unit.localeCompare(b.unit));
  result.warnings = [...warnings];
  return result;
}
