import { describe, expect, it } from "vitest";
import { initialCounts, quantityPreview, subjects } from "../fixtures";

const crate = (result: ReturnType<typeof quantityPreview>, id: string) =>
  result.lines.find((line) => line.owner_id === id && !line.material_id)
    ?.quantity;

describe("Precision prototype uses authoritative quantity rules", () => {
  it("requires an explicit complete Science set rather than inferring one", () => {
    expect(crate(quantityPreview(initialCounts, 0, 1), "universal")).toBe(0);
    expect(crate(quantityPreview(initialCounts, 2, 1), "universal")).toBe(2);
    expect(() => quantityPreview({ ...initialCounts, s10: 0 }, 1, 1)).toThrow(
      /exceeds/,
    );
  });

  it("keeps Mathematics demand independent from Science crates", () => {
    const result = quantityPreview({ ...initialCounts, m8: 7 }, 1, 1);
    expect(crate(result, "common-8")).toBe(2);
    expect(crate(result, "universal")).toBe(1);
    expect(
      result.totals.find((line) => line.inventory_item_id === "demo-solids")
        ?.quantity,
    ).toBe(7);
  });

  it("scopes common-crate changes to the selected Science grade and counts shared material once", () => {
    const result = quantityPreview(initialCounts, 1, 3);
    expect(crate(result, "common-8")).toBe(6);
    expect(crate(result, "common-9")).toBe(2);
    expect(
      result.totals.find((line) => line.inventory_item_id === "demo-scope-8")
        ?.quantity,
    ).toBe(6);
    expect(
      result.lines.filter((line) => line.inventory_item_id === "demo-scope-8"),
    ).toHaveLength(1);
  });

  it.each([-1, 0.5, NaN])("rejects invalid selected set count %s", (count) => {
    expect(() =>
      quantityPreview({ ...initialCounts, s8: count }, 0, 1),
    ).toThrow();
  });

  it("never mutates the approved fixture when preview rules change", () => {
    const before = structuredClone(subjects);
    quantityPreview(initialCounts, 1, 4);
    expect(subjects).toEqual(before);
    expect(crate(quantityPreview(initialCounts, 1, 1), "common-8")).toBe(2);
  });
});
