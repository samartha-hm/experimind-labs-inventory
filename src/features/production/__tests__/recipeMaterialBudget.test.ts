import { describe, expect, it } from "vitest";
import type { RecipeDefinition } from "../../../entity/ProductionPlanning";
import { partitionRecipeMaterialBudget, recipeMaterialBudget } from "../recipeMaterialBudget";

const recipe = (): RecipeDefinition => ({
  output_item_id: "bottle", yield_quantity: "1", unit: "bottle",
  inputs: [{ item_id: "liquid", quantity: "2", unit: "L", canonical_quantity: "2", scrap_percent: "0" }],
  instructions: "", specification: "", concentration: "",
});
const units = { bottle: "bottle", liquid: "L" };

describe("approved recipe material allowance calculation", () => {
  it("keeps ten bottle obligations separate from their twenty litre allowance", () => {
    expect(recipeMaterialBudget(recipe(), "10", units)).toEqual([{ item: "liquid", unit: "L", quantity: "20.0000" }]);
  });

  it("includes only the scrap percentage frozen in the recipe", () => {
    const r = recipe(); r.inputs[0].scrap_percent = "5";
    expect(recipeMaterialBudget(r, "10", units)[0].quantity).toBe("21.0000");
  });

  it("uses canonical quantities without converting the same material twice", () => {
    const r = recipe();
    Object.assign(r.inputs[0], { quantity: "2000", unit: "mL", conversion_id: "frozen", conversion_factor: "0.001" });
    expect(recipeMaterialBudget(r, "0.5", units)[0]).toEqual({ item: "liquid", unit: "L", quantity: "1.0000" });
  });

  it("supports exact partial output without mutating the approved recipe", () => {
    const r = recipe(), before = JSON.stringify(r);
    expect(recipeMaterialBudget(r, "0.0001", units)[0].quantity).toBe("0.0002");
    expect(JSON.stringify(r)).toBe(before);
  });

  it("rejects fractional stock quanta instead of inventing extra capacity", () => {
    const r = recipe(); r.yield_quantity = "3";
    expect(() => recipeMaterialBudget(r, "1", units)).toThrow("inexact");
  });

  it("rejects duplicate shared input rows instead of consuming them twice", () => {
    const r = recipe(); r.inputs.push({ ...r.inputs[0] });
    expect(() => recipeMaterialBudget(r, "1", units)).toThrow("Duplicate");
  });

  it.each(["0", "-1", "NaN", "0.00001", "100000000"])("rejects unsupported claimed output %s", q => {
    expect(() => recipeMaterialBudget(recipe(), q, units)).toThrow();
  });

  it("rejects a missing canonical input unit", () => {
    expect(() => recipeMaterialBudget(recipe(), "1", { bottle: "bottle" })).toThrow("Canonical material");
  });

  it("rejects a changed output unit", () => {
    expect(() => recipeMaterialBudget(recipe(), "1", { ...units, bottle: "L" })).toThrow("canonical inventory");
  });

  it.each(["-1", "100.0001"])("rejects unsupported scrap %s", scrap => {
    const r = recipe(); r.inputs[0].scrap_percent = scrap;
    expect(() => recipeMaterialBudget(r, "1", units)).toThrow();
  });

  it("rejects an allowance outside the existing stock ledger range", () => {
    expect(() => recipeMaterialBudget(recipe(), "99999999.9999", units)).toThrow("ledger range");
  });

  it("rejects a zero recipe yield", () => {
    const r = recipe(); r.yield_quantity = "0";
    expect(() => recipeMaterialBudget(r, "1", units)).toThrow("Positive");
  });

  it("rejects self-consuming output", () => {
    const r = recipe(); r.inputs[0].item_id = "bottle";
    expect(() => recipeMaterialBudget(r, "1", units)).toThrow("self-consuming");
  });

  it("partitions a capped parent without creating fresh material capacity", () => {
    const parts = partitionRecipeMaterialBudget(recipe(), "10", units, [
      { id: "first", quantity: "6" }, { id: "remainder", quantity: "4" },
    ]);
    expect(parts.map(p => p.materials[0].quantity)).toEqual(["12.0000", "8.0000"]);
  });

  it.each(["3", "5"])("rejects a parent partition with remainder %s", remainder => {
    expect(() => partitionRecipeMaterialBudget(recipe(), "10", units, [
      { id: "first", quantity: "6" }, { id: "remainder", quantity: remainder },
    ])).toThrow("entire parent");
  });

  it("blocks only an inexact partial partition even when the whole allowance is exact", () => {
    const r = recipe(); r.yield_quantity = "3";
    expect(recipeMaterialBudget(r, "3", units)[0].quantity).toBe("2.0000");
    expect(() => partitionRecipeMaterialBudget(r, "3", units, [
      { id: "first", quantity: "1" }, { id: "remainder", quantity: "2" },
    ])).toThrow("Partial material allocation is inexact");
  });

  it("rejects repeated child identities", () => {
    expect(() => partitionRecipeMaterialBudget(recipe(), "10", units, [
      { id: "same", quantity: "6" }, { id: "same", quantity: "4" },
    ])).toThrow("Distinct child");
  });
});
