import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { normalizeSubjects } from "../ProductTemplateService";
import { previewQuantities } from "../../features/kit-builder/quantityRules";
import type { KitCrate, KitMaterial, KitSubject } from "../../entity/ProductTemplateVersion";

function fixture() {
  const item = randomUUID();
  const material = (quantity = 2): KitMaterial => ({ id: randomUUID(), inventory_item_id: item, item_name: "Shared material", quantity, unit: "pcs" });
  const science: KitSubject = { id: randomUUID(), name: "Science", grades: [8, 9, 10].map(number => ({ id: randomUUID(), name: `Grade ${number}`, activities: [] })) };
  const maths: KitSubject = { id: randomUUID(), name: "Mathematics", grades: [8, 9, 10].map(number => ({ id: randomUUID(), name: `Grade ${number}`, activities: [{ id: randomUUID(), name: `Math ${number}`, materials: [material(3)] }] })) };
  const components = science.grades.map(grade => ({ subject_id: science.id, grade_id: grade.id, quantity: 1 }));
  science.crates = components.map((component, index) => ({ id: randomUUID(), name: `Common ${index + 8}`, kind: "common", reusable: true, materials: [material()], rule: { kind: "selected_sets", components: [component] } }));
  const universal: KitCrate = { id: randomUUID(), name: "Universal", kind: "universal", materials: [material(0.25)], rule: { kind: "complete_sets", components } };
  science.crates.push(universal);
  return { subjects: [science, maths], science, maths, universal, item, material,
    context: (counts: number[], complete?: number) => ({ grade_quantities: Object.fromEntries(science.grades.map((grade, index) => [grade.id, counts[index] ?? 0])), ...(complete !== undefined ? { complete_sets: { [universal.id]: complete } } : {}) }) };
}
describe("version-owned crate definitions", () => {
  it("normalizes stable crate CRUD/reordering, flags, notes and rule references without mutating input", () => {
    const f = fixture(); const original = structuredClone(f.subjects);
    const saved = normalizeSubjects(f.subjects);
    expect(saved[0].crates).toMatchObject(f.science.crates!);
    const edited = structuredClone(saved); edited[0].crates!.reverse(); edited[0].crates![0].name = " Edited "; edited[0].crates![0].notes = " fragile "; edited[0].crates![0].optional = true;
    const next = normalizeSubjects(edited);
    expect(next[0].crates![0]).toMatchObject({ id: f.universal.id, name: "Edited", notes: "fragile", optional: true });
    edited[0].crates = []; expect(normalizeSubjects(edited)[0].crates).toEqual([]);
    expect(f.subjects).toEqual(original);
    expect(saved[0].crates![3].name).toBe("Universal");
  });
  it.each([null, {}, [null], [{ name: "Crate", kind: "common", materials: [], rule: { kind: "javascript", expression: "1" } }]])("rejects malformed crate definitions %#", crates => {
    expect(() => normalizeSubjects([{ name: "Subject", grades: [], crates }])).toThrow();
  });
  it.each(["id", "name", "kind", "notes", "optional", "unit", "quantity", "reference", "rule", "duplicate", "component", "extra"]) ("rejects invalid crate %s", field => {
    const f = fixture(); const crate = f.science.crates![0];
    if (field === "id") crate.id = f.science.id;
    if (field === "name") crate.name = " ";
    if (field === "kind") Object.assign(crate, { kind: "box" });
    if (field === "notes") crate.notes = "x".repeat(2001);
    if (field === "optional") Object.assign(crate, { optional: "yes" });
    if (field === "unit") crate.materials[0].unit = "";
    if (field === "quantity") crate.materials[0].quantity = 0.0000001;
    if (field === "reference" && "components" in crate.rule) crate.rule.components[0].subject_id = f.maths.id;
    if (field === "rule") Object.assign(crate, { rule: { kind: "fixed", quantity: -1 } });
    if (field === "duplicate") f.science.crates!.push({ ...crate, id: randomUUID() });
    if (field === "component") Object.assign(crate, { rule: { kind: "selected_sets", components: [] } });
    if (field === "extra") Object.assign(crate, { approved_production: true });
    expect(() => normalizeSubjects(f.subjects)).toThrow();
  });
  it("rejects dangling rules when a referenced grade is removed", () => {
    const f = fixture(); f.science.grades.pop(); expect(() => normalizeSubjects(f.subjects)).toThrow(/owning subject/);
  });
});
describe("generic deterministic quantity previews", () => {
  it.each([[[1, 1, 1], 1, [1, 1, 1, 1]], [[2, 2, 2], 2, [2, 2, 2, 2]], [[1, 0, 0], 0, [1, 0, 0, 0]], [[0, 0, 0], 0, [0, 0, 0, 0]], [[30, 20, 25], 10, [30, 20, 25, 10]]])("applies explicit complete and partial Science decisions %#", (counts, complete, expected) => {
    const f = fixture(); const result = previewQuantities(f.subjects, f.context(counts as number[], complete as number));
    expect(result.lines.filter(line => line.unit === "crates").map(line => line.quantity)).toEqual(expected);
  });
  it("blocks absent bundle decisions, including unequal grade quantities and partial sets", () => {
    const f = fixture(); for (const counts of [[30, 20, 25], [2, 2, 2], [1, 0, 0]]) expect(() => previewQuantities(f.subjects, f.context(counts))).toThrow(/explicit integer/);
  });
  it("rejects complete counts beyond any component and non-integer counts", () => {
    const f = fixture(); for (const count of [21, -1, 0.5, NaN, Infinity]) expect(() => previewQuantities(f.subjects, f.context([30, 20, 25], count))).toThrow();
  });
  it("keeps Mathematics quantities independent and produces no Math common crate", () => {
    const f = fixture(); const context = f.context([0, 0, 0], 0); context.grade_quantities[f.maths.grades[0].id] = 7;
    const result = previewQuantities(f.subjects, context);
    expect(result.lines.filter(line => line.unit === "crates").every(line => line.quantity === 0)).toBe(true);
    expect(result.totals).toEqual([{ inventory_item_id: f.item, unit: "pcs", quantity: 21 }]);
  });
  it("multiplies selected component weights and scope/fixed counts without name-specific branches", () => {
    const f = fixture(); f.science.name = "Robotics"; f.science.grades.forEach((grade, index) => { grade.name = `Variant ${index}`; });
    const common = f.science.crates![0]; common.rule = { kind: "selected_sets", components: f.science.grades.map(grade => ({ subject_id: f.science.id, grade_id: grade.id, quantity: 2 })) };
    const extra = ["fixed", "per_project", "per_site"].map(kind => ({ ...common, id: randomUUID(), name: kind, materials: [], rule: { kind, quantity: 3 } } as KitCrate));
    f.science.crates = [common, ...extra];
    expect(previewQuantities(f.subjects, { grade_quantities: f.context([1, 2, 3]).grade_quantities, project_count: 2, site_count: 4 }).lines.filter(line => line.unit === "crates").map(line => line.quantity)).toEqual([12, 3, 6, 12]);
    expect(() => previewQuantities(f.subjects, { grade_quantities: {} })).toThrow(/explicit integer/);
  });
  it("supports weighted complete bundles and rejects insufficient component quantities", () => {
    const f = fixture(); if ("components" in f.universal.rule) f.universal.rule.components[0].quantity = 2;
    expect(previewQuantities(f.subjects, f.context([4, 2, 2], 2)).lines.find(line => line.owner_id === f.universal.id && !line.material_id)?.quantity).toBe(2);
    expect(() => previewQuantities(f.subjects, f.context([3, 2, 2], 2))).toThrow(/exceeds/);
  });
  it("supports optional materials/crates and traceable explicit overrides without implicit stock adjustment", () => {
    const f = fixture(); f.universal.optional = true; const common = f.science.crates![0]; const material = common.materials[0]; material.optional = true;
    expect(previewQuantities(f.subjects, f.context([2, 2, 2])).lines.find(line => line.material_id === material.id)?.quantity).toBe(0);
    const context = { ...f.context([2, 2, 2], 2), included_optional: [f.universal.id, material.id], overrides: { [common.id]: { quantity: 3, reason: "Extra teaching crate" }, [material.id]: { quantity: 9.5, reason: "Explicit material requirement" } } };
    const result = previewQuantities(f.subjects, context);
    expect(result.lines.find(line => line.material_id === material.id)).toMatchObject({ quantity: 9.5, multiplier: 3, basis: "Explicit final material override: Explicit material requirement" });
    expect(() => previewQuantities(f.subjects, { ...context, included_optional: [] })).toThrow(/Include/);
    expect(() => previewQuantities(f.subjects, { ...context, overrides: { [common.id]: { quantity: 1, reason: " " } } })).toThrow(/reason/);
  });
  it("prevents material overrides bypassing an excluded parent", () => {
    const f = fixture(); f.universal.optional = true;
    expect(() => previewQuantities(f.subjects, { ...f.context([1, 1, 1]), overrides: { [f.universal.materials[0].id]: { quantity: 2, reason: "Override" } } })).toThrow(/owning optional/);
  });
  it("aggregates by inventory item and unit, with deterministic decimal multiplication and no double count from packing", () => {
    const f = fixture(); f.science.crates = [f.science.crates![0]]; f.science.crates[0].materials[0].quantity = 0.1;
    f.science.grades[0].packing = [{ id: randomUUID(), kind: "box", name: "Assignment", activity_ids: [], inventory_item_ids: [f.item], children: [] }];
    f.science.crates.push({ ...f.science.crates[0], id: randomUUID(), name: "Other unit", materials: [{ ...f.material(1), unit: "kg" }] });
    const context = f.context([3, 0, 0]); const before = JSON.stringify({ subjects: f.subjects, context });
    const result = previewQuantities(f.subjects, context);
    expect(result.totals.map(total => [total.unit, total.quantity])).toEqual([["kg", 3], ["pcs", 0.3]]);
    expect(previewQuantities(f.subjects, context)).toEqual(result); expect(JSON.stringify({ subjects: f.subjects, context })).toBe(before);
  });
  it.each([{ grade_quantities: { unknown: 1 } }, { grade_quantities: {}, complete_sets: { unknown: 0 } }, { grade_quantities: {}, included_optional: ["unknown"] }, { grade_quantities: {}, overrides: { unknown: { quantity: 1, reason: "x" } } }, { grade_quantities: {}, inferred: true }, { grade_quantities: {}, site_count: 0.5 }])("rejects unknown or malformed preview decisions %#", context => {
    expect(() => previewQuantities(fixture().subjects, context)).toThrow();
  });
  it("blocks incomplete active material quantities and excessive totals", () => {
    const f = fixture(); f.science.crates = [f.science.crates![0]]; const material = f.science.crates[0].materials[0]; material.quantity = 0;
    expect(() => previewQuantities(f.subjects, f.context([1, 0, 0]))).toThrow(/Complete the material/);
    material.quantity = 1000000000; expect(() => previewQuantities(f.subjects, f.context([2, 0, 0]))).toThrow();
  });
});
