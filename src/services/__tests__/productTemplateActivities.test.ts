import { describe, it, expect } from "vitest";
import { normalizeActivities, normalizeMaterials, normalizeSubjects, DraftKitError } from "../ProductTemplateService.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const material = (overrides: Record<string, unknown> = {}) => ({
  inventory_item_id: crypto.randomUUID(), item_name: "Beaker", quantity: 2, ...overrides,
});
const activity = (overrides: Record<string, unknown> = {}) => ({
  name: "Mixing colours", materials: [], ...overrides,
});
const grade = (name: string, activities: unknown[] = []) => ({ id: crypto.randomUUID(), name, activities });

describe("normalizeMaterials", () => {
  it("normalizes a valid material and computes the complete flag", () => {
    const input = material({ unit: " ml ", notes: " handle with care ", optional: true, reusable: true });
    const result = normalizeMaterials([input], new Set());
    expect(result).toHaveLength(1);
    expect(result[0].item_name).toBe("Beaker");
    expect(result[0].quantity).toBe(2);
    expect(result[0].unit).toBe("ml");
    expect(result[0].notes).toBe("handle with care");
    expect(result[0].optional).toBe(true);
    expect(result[0].reusable).toBe(true);
    expect(result[0].complete).toBe(true);
    expect(uuid.test(result[0].id)).toBe(true);
  });
  it("defaults missing quantities to 0 and marks the material incomplete", () => {
    const result = normalizeMaterials([material({ quantity: undefined })], new Set());
    expect(result[0].quantity).toBe(0);
    expect(result[0].complete).toBe(false);
  });
  it("marks zero quantities as incomplete even when the client claims complete", () => {
    const result = normalizeMaterials([material({ quantity: 0, complete: true })], new Set());
    expect(result[0].complete).toBe(false);
  });
  it("defaults the unit to pcs and preserves identifiers", () => {
    const id = crypto.randomUUID();
    const result = normalizeMaterials([material({ unit: undefined, id })], new Set());
    expect(result[0].unit).toBe("pcs");
    expect(result[0].id).toBe(id);
  });
  it("rejects invalid inventory references, names, quantities and duplicates", () => {
    const duplicateId = crypto.randomUUID();
    for (const value of [
      [material({ inventory_item_id: "not-a-uuid" })],
      [material({ inventory_item_id: 12 })],
      [material({ item_name: "" })],
      [material({ item_name: "x".repeat(201) })],
      [material({ quantity: -1 })],
      [material({ quantity: Number.NaN })],
      [material({ quantity: "2" })],
      [material({ unit: "x".repeat(21) })],
      [material({ notes: "x".repeat(501) })],
      [material({ inventory_item_id: duplicateId }), material({ inventory_item_id: duplicateId })],
      [null],
      "Beaker",
      Array.from({ length: 101 }, () => material()),
    ]) {
      expect(() => normalizeMaterials(value, new Set())).toThrow(DraftKitError);
    }
  });
});

describe("normalizeActivities", () => {
  it("normalizes a valid activity with materials and preserves order", () => {
    const first = material();
    const second = material({ item_name: "Funnel", quantity: 0 });
    const result = normalizeActivities([activity({ code: " 8.4.1 ", materials: [first, second] }), activity({ name: "Observe seeds" })], new Set());
    expect(result.map(a => a.name)).toEqual(["Mixing colours", "Observe seeds"]);
    expect(result[0].code).toBe("8.4.1");
    expect(result[0].materials.map(m => m.item_name)).toEqual(["Beaker", "Funnel"]);
    expect(result[0].materials[1].complete).toBe(false);
    expect(result[1].materials).toEqual([]);
    expect(result.every(a => uuid.test(a.id))).toBe(true);
  });
  it("defaults missing activity lists to empty when normalizing subjects", () => {
    const result = normalizeSubjects([{ id: crypto.randomUUID(), name: "Science", grades: [{ id: crypto.randomUUID(), name: "Grade 8" }] }]);
    expect(result[0].grades[0].activities).toEqual([]);
  });
  it("rejects invalid activities, names, duplicates and oversized structures", () => {
    for (const value of [
      [activity({ name: "" })],
      [activity({ name: "x".repeat(101) })],
      [activity({ code: "x".repeat(51) })],
      [activity({ description: "x".repeat(2001) })],
      [activity({ instructions: "x".repeat(5001) })],
      [activity({ reference_url: "x".repeat(501) })],
      [activity(), activity()],
      [null],
      [12],
      "Mixing colours",
      Array.from({ length: 101 }, () => activity()),
    ]) {
      expect(() => normalizeActivities(value, new Set())).toThrow(DraftKitError);
    }
  });
  it("rejects duplicate activity names within a grade but allows them across grades", () => {
    expect(() => normalizeActivities([activity(), activity({ name: "MIXING COLOURS" })], new Set())).toThrow(/unique within a grade/);
    const result = normalizeSubjects([
      { id: crypto.randomUUID(), name: "Science", grades: [grade("Grade 8", [activity()])] },
      { id: crypto.randomUUID(), name: "Mathematics", grades: [grade("Grade 8", [activity()])] },
    ]);
    expect(result[0].grades[0].activities[0].name).toBe("Mixing colours");
    expect(result[1].grades[0].activities[0].name).toBe("Mixing colours");
  });
  it("rejects materials that are not a list", () => {
    expect(() => normalizeActivities([activity({ materials: "Beaker" })], new Set())).toThrow(/Materials must be a list/);
  });
  it("rejects invalid materials nested inside activities", () => {
    expect(() => normalizeActivities([activity({ materials: [material({ quantity: -3 })] })], new Set())).toThrow(/nonnegative/);
    const duplicateId = crypto.randomUUID();
    expect(() => normalizeActivities([activity({ materials: [material({ inventory_item_id: duplicateId }), material({ inventory_item_id: duplicateId })] })], new Set())).toThrow(/only once per activity/);
  });
});
