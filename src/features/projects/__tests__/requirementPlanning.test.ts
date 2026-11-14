import { describe, it, expect } from "vitest";
import { randomUUID } from "node:crypto";
import { calculateRequirements, convertDemand } from "../requirementPlanning";
import { normalizePlanning } from "../../../services/ProjectPlanningService";
import { planningFixture } from "./planningFixture";

describe("Consolidated project requirement planning", () => {
  const calculate = (f: ReturnType<typeof planningFixture>, conversions: Parameters<typeof calculateRequirements>[5] = []) => calculateRequirements(randomUUID(), 1, f.content, [f.version], f.items, conversions);
  it("calculates complete School A and partial School B without duplicate pouch demand", () => {
    const f = planningFixture(); const result = calculate(f);
    expect(result.materials[0].gross_demand).toBe(3.3); // activity .9 + common 1.8 + universal .6
    expect(result.lines.filter(l => !l.material_id && l.owner_id === f.universalId).map(l => l.quantity)).toEqual([2, 0]);
    expect(result.lines.filter(l => !l.material_id && l.source === "crate" && l.owner_id !== f.universalId).map(l => l.quantity)).toEqual([2, 2, 2, 3, 0, 0]);
    expect(result.packing_assignments).toHaveLength(16);
    expect(result.packing_assignments.every(a => a.demand === false)).toBe(true);
    expect(result.lines.every(l => l.version_id === f.versionId && l.site_id && l.subject_id)).toBe(true);
  });
  it("keeps Mathematics independent and supplies no common or universal crates", () => {
    const f = planningFixture(); f.content.sites = [f.content.sites[1]];
    f.content.sites[0].selections[0].context.grade_quantities = { [f.mathGradeId]: 5 };
    const result = calculate(f);
    expect(result.materials[0].gross_demand).toBe(2);
    expect(result.lines.filter(l => l.source === "crate").every(l => l.quantity === 0)).toBe(true);
  });
  it("requires an explicit decision for unequal grades instead of inferring minimum", () => {
    const f = planningFixture(); const context = f.content.sites[0].selections[0].context;
    context.grade_quantities[f.gradeIds[1]] = 4; delete context.complete_sets;
    expect(() => calculate(f)).toThrow(/explicit integer/);
    context.complete_sets = { [f.universalId]: 1 };
    expect(calculate(f).lines.find(l => l.owner_id === f.universalId)?.quantity).toBe(1);
    context.complete_sets[f.universalId] = 3;
    expect(() => calculate(f)).toThrow(/exceeds a selected/);
  });
  it("retains null unknown balances despite known positive demand", () => {
    const result = calculate(planningFixture());
    expect(result.operational_release).toBe(false);
    expect(result.materials[0]).toMatchObject({ stock_status: "unverified", verified_on_hand: null, active_reservations: null,
      available_to_promise: null, incoming: null, immediate_shortage: null, projected_shortage: null });
    expect(result.warnings.some(w => w.includes("NOT VERIFIED"))).toBe(true);
  });
  it("applies reasoned project defaults and site precedence without mutating masters", () => {
    const f = planningFixture(); const before = structuredClone(f.subjects); const material = f.subjects[0].grades[0].activities[0].materials[0];
    f.content.overrides[f.versionId] = { [material.id]: { quantity: 5, reason: "NGO default" } };
    f.content.sites[1].selections[0].context.overrides = { [material.id]: { quantity: 7, reason: "School B allocation" } };
    const result = calculate(f);
    expect(result.lines.filter(l => l.material_id === material.id).map(l => [l.quantity, l.override_scope])).toEqual([[5, "project"], [7, "site"]]);
    expect(f.subjects).toEqual(before);
  });
  it("converts only explicit units with exact decimal arithmetic", () => {
    const f = planningFixture(); f.items[0].unit = "cm";
    const conversion = { id: randomUUID(), item_id: f.itemId, from_uom: "m", to_uom: "cm", conversion_factor: "100.000000" };
    const result = calculate(f, [conversion]);
    expect(result.materials[0]).toMatchObject({ unit: "cm", gross_demand: 330 });
    expect(result.lines.filter(l => l.material_id && l.quantity > 0).every(l => l.conversion_id === conversion.id && l.source_unit === "m")).toBe(true);
    expect(convertDemand(0.1, "0.200000")).toBe(0.02);
  });
  it.each(["mismatch", "ambiguous", "missing", "precision"])("flags %s units and keeps demand instead of guessing", scenario => {
    const f = planningFixture(); f.items[0].unit = scenario === "missing" ? "" : "cm";
    const conversion = { id: randomUUID(), from_uom: "m", to_uom: "cm", conversion_factor: scenario === "precision" ? "0.000001" : "100" };
    const conversions = scenario === "ambiguous" ? [conversion, { ...conversion, id: randomUUID() }] : scenario === "precision" ? [conversion] : [];
    const result = calculate(f, conversions);
    expect(result.materials[0]).toMatchObject({ unit: "m", gross_demand: 3.3 });
    expect(result.warnings.length).toBeGreaterThan(2);
  });
  it("prefers a unique item-specific conversion over an explicit global conversion", () => {
    const f = planningFixture(); f.items[0].unit = "cm";
    const global = { id: randomUUID(), from_uom: "m", to_uom: "cm", conversion_factor: "100" };
    expect(calculate(f, [global, { ...global, id: randomUUID(), item_id: f.itemId, conversion_factor: "10" }]).materials[0].gross_demand).toBe(33);
  });
  it("rejects precision loss, zero conversion and numeric overflow", () => {
    expect(() => convertDemand(0.1, "0.000001")).toThrow(/precision/);
    expect(() => convertDemand(1, "0")).toThrow(/positive/);
    expect(() => convertDemand(1, "NaN")).toThrow(/Invalid/);
    expect(() => convertDemand(1000000000, "1000000")).toThrow(/range/);
  });
  it("allocates reusable per-project crates once at an explicitly chosen school", () => {
    const f = planningFixture(); const crate = f.subjects[0].crates![3]; crate.rule = { kind: "per_project", quantity: 1 };
    f.content.sites[0].selections[0].context = { grade_quantities: {}, project_count: 1 };
    f.content.sites[1].selections[0].context = { grade_quantities: {}, project_count: 0 };
    expect(calculate(f).lines.filter(l => !l.material_id && l.owner_id === crate.id).map(l => l.quantity)).toEqual([1, 0]);
    f.content.sites[1].selections[0].context.project_count = 1;
    expect(() => calculate(f)).toThrow(/one site only/);
  });
  it("validates site counts and unknown template references", () => {
    const f = planningFixture(); f.content.sites[0].selections[0].context.site_count = 2;
    expect(() => calculate(f)).toThrow(/0 or 1/);
    f.content.sites[0].selections[0].version_id = randomUUID();
    expect(() => calculate(f)).toThrow(/approved version/);
  });
  it("rejects default overrides that are invalid even when a site shadows them", () => {
    const f = planningFixture();
    f.content.overrides[f.versionId] = { [f.universalId]: { quantity: 1, reason: "" } };
    for (const site of f.content.sites) site.selections[0].context.overrides = { [f.universalId]: { quantity: 1, reason: "Valid site reason" } };
    expect(() => calculate(f)).toThrow(/reason/);
  });
  it.each(["per_project", "per_site"] as const)("prevents overrides duplicating a shared %s allocation", kind => {
    const f = planningFixture(); const crate = f.subjects[0].crates![3]; crate.rule = { kind, quantity: 1 };
    const context = { grade_quantities: {}, project_count: 0, site_count: 0, overrides: { [crate.id]: { quantity: 2, reason: "Explicit shared allocation" } } };
    f.content.sites[0].selections[0].context = context;
    if (kind === "per_project") f.content.sites[1].selections[0].context = structuredClone(context);
    else f.content.sites[0].selections.push({ ...f.content.sites[0].selections[0], id: randomUUID(), context: structuredClone(context) });
    expect(() => calculate(f)).toThrow(/one explicit allocation/);
  });
  it("supports optional selections and explicit overrides", () => {
    const f = planningFixture(); const crate = f.subjects[0].crates![3]; crate.optional = true;
    expect(calculate(f).materials[0].gross_demand).toBe(2.7);
    const context = f.content.sites[0].selections[0].context;
    context.included_optional = [crate.id]; context.overrides = { [crate.id]: { quantity: 1, reason: "Explicit smaller shipment" } };
    expect(calculate(f).materials[0].gross_demand).toBe(3);
  });
  it("rejects forged nested ownership, duplicate identities and invalid overrides", () => {
    const f = planningFixture(); expect(normalizePlanning(f.content)).toEqual(f.content);
    expect(() => normalizePlanning({ ...f.content, organization_id: randomUUID() })).toThrow(/unknown/);
    expect(() => normalizePlanning({ ...f.content, sites: [{ ...f.content.sites[0], organization_id: randomUUID() }] })).toThrow(/unknown/);
    f.content.sites[1].id = f.content.sites[0].id; expect(() => normalizePlanning(f.content)).toThrow(/unique/);
  });
});
