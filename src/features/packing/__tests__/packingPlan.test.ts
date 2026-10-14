import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { calculateRequirements } from "../../projects/requirementPlanning";
import { planningFixture } from "../../projects/__tests__/planningFixture";
import { stockUnits } from "../../inventory/physicalQuantity";
import { materializePacking } from "../packingPlan";

function plan(f: ReturnType<typeof planningFixture>, index = 0) {
  const site = f.content.sites[index];
  const preview = calculateRequirements(randomUUID(), 1, f.content, [f.version], f.items, []);
  return materializePacking(f.content.name, site, [f.version], preview.lines.filter(l => l.site_id === site.id));
}
function quantity(snapshot: ReturnType<typeof plan>) {
  return snapshot.packages.flatMap(p => p.materials).reduce((n, m) => n + stockUnits(m.quantity), 0n);
}
describe("physical packing materialization", () => {
  it("creates distinct packages for two complete Science sets", () => {
    const snapshot = plan(planningFixture());
    expect(snapshot.packages.filter(p => p.kind === "common_crate")).toHaveLength(6);
    expect(snapshot.packages.filter(p => p.kind === "universal_crate")).toHaveLength(2);
    expect(snapshot.packages.filter(p => p.kind === "kit")).toHaveLength(2);
    expect(new Set(snapshot.packages.map(p => p.id)).size).toBe(snapshot.packages.length);
    expect(quantity(snapshot)).toBe(24000n);
  });
  it("creates three Grade 8 sets without universal crates", () => {
    const snapshot = plan(planningFixture(), 1);
    expect(snapshot.packages.filter(p => p.kind === "common_crate")).toHaveLength(3);
    expect(snapshot.packages.filter(p => p.kind === "universal_crate")).toHaveLength(0);
    expect(snapshot.packages.filter(p => p.kind === "kit")).toHaveLength(3);
    expect(quantity(snapshot)).toBe(9000n);
  });
  it("does not multiply material demand through duplicate pouch references", () => {
    const snapshot = plan(planningFixture());
    const pouches = snapshot.packages.filter(p => p.kind === "pouch");
    expect(pouches).toHaveLength(12);
    expect(pouches.filter(p => p.materials.length)).toHaveLength(6);
    expect(pouches.flatMap(p => p.materials).reduce((n, m) => n + stockUnits(m.quantity), 0n)).toBe(6000n);
  });
  it("keeps mathematics independent with no crates", () => {
    const f = planningFixture();
    f.content.sites[0].selections[0].context.grade_quantities = { [f.mathGradeId]: 5 };
    f.content.sites[0].selections[0].context.complete_sets = { [f.universalId]: 0 };
    const snapshot = plan(f);
    expect(snapshot.packages.filter(p => p.kind.endsWith("_crate"))).toHaveLength(0);
    expect(snapshot.packages.filter(p => p.kind === "kit")).toHaveLength(5);
    expect(quantity(snapshot)).toBe(20000n);
  });
  it("groups only explicitly declared complete sets with unequal grades", () => {
    const f = planningFixture();
    const context = f.content.sites[0].selections[0].context;
    context.grade_quantities[f.gradeIds[1]] = 4;
    context.complete_sets = { [f.universalId]: 1 };
    const snapshot = plan(f);
    expect(snapshot.packages.filter(p => p.name === "Complete set")).toHaveLength(1);
    expect(snapshot.packages.filter(p => p.kind === "kit")).toHaveLength(6);
    expect(snapshot.packages.filter(p => p.kind === "universal_crate")).toHaveLength(1);
  });
  it("preserves masters and earlier physical snapshots", () => {
    const f = planningFixture(), before = structuredClone(f);
    const first = plan(f), retained = structuredClone(first);
    plan(f);
    expect(f).toEqual(before);
    expect(first).toEqual(retained);
    expect(first.packages.every(p => !p.parent_id || first.packages.some(parent => parent.id === p.parent_id))).toBe(true);
  });
});
