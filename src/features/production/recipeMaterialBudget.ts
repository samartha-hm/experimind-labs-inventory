import type { RecipeDefinition } from "../../entity/ProductionPlanning";
import { stockText, stockUnits } from "../inventory/physicalQuantity";

export interface RecipeMaterialAllowance {
  item: string;
  unit: string;
  quantity: string;
}

/**
 * Calculate a frozen work-order allowance from an already approved canonical recipe.
 * This calculation conveys no authorization: callers must lock and transfer the
 * output claim before persisting its allowance through the trusted ledger writer.
 * Derive once for the parent claim; splitting work must partition this allowance.
 */
export function recipeMaterialBudget(
  recipe: RecipeDefinition,
  claimedOutput: string,
  canonicalUnits: Readonly<Record<string, string>>,
): RecipeMaterialAllowance[] {
  const output = stockUnits(claimedOutput);
  const yieldQuantity = stockUnits(recipe.yield_quantity);
  if (!output || !yieldQuantity) throw new Error("Positive claimed output and recipe yield required");
  if (!recipe.output_item_id || !recipe.unit || canonicalUnits[recipe.output_item_id] !== recipe.unit)
    throw new Error("Recipe output must use its canonical inventory unit");
  if (!Array.isArray(recipe.inputs) || !recipe.inputs.length || recipe.inputs.length > 100)
    throw new Error("One to 100 approved recipe inputs required");

  const seen = new Set<string>();
  return recipe.inputs.map(input => {
    if (!input.item_id || input.item_id === recipe.output_item_id || seen.has(input.item_id))
      throw new Error("Duplicate or self-consuming recipe input");
    seen.add(input.item_id);
    const unit = canonicalUnits[input.item_id];
    if (typeof unit !== "string" || !unit.trim() || unit.length > 30 || unit === "slots")
      throw new Error("Canonical material inventory unit required");
    const quantity = stockUnits(input.canonical_quantity);
    const scrap = stockUnits(input.scrap_percent);
    if (!quantity || scrap > 1_000_000n) throw new Error("Positive input and zero to 100 percent scrap required");

    // Percent has four decimal places: 100% = 1,000,000. Never silently
    // round up capacity or round down a physical material requirement.
    const numerator = quantity * output * (1_000_000n + scrap);
    const denominator = yieldQuantity * 1_000_000n;
    if (numerator % denominator)
      throw new Error("Recipe allowance is inexact in four-place physical stock units");
    return { item: input.item_id, unit, quantity: stockText(numerator / denominator) };
  }).sort((a, b) => a.item < b.item ? -1 : a.item > b.item ? 1 : 0);
}

/** Partition a once-derived parent allowance; never recalculate rounded child caps. */
export function partitionRecipeMaterialBudget(
  recipe: RecipeDefinition,
  parentOutput: string,
  canonicalUnits: Readonly<Record<string, string>>,
  children: readonly { id: string; quantity: string }[],
): { id: string; quantity: string; materials: RecipeMaterialAllowance[] }[] {
  const parent = stockUnits(parentOutput);
  const budget = recipeMaterialBudget(recipe, parentOutput, canonicalUnits);
  if (children.length < 2 || children.length > 100) throw new Error("Two to 100 explicit partition children required");
  const ids = new Set<string>();
  let total = 0n;
  const partition = children.map(child => {
    if (!child.id.trim() || ids.has(child.id)) throw new Error("Distinct child identities required");
    ids.add(child.id);
    const quantity = stockUnits(child.quantity);
    if (!quantity) throw new Error("Positive child output required");
    total += quantity;
    const materials = budget.map(material => {
      const numerator = stockUnits(material.quantity) * quantity;
      if (numerator % parent) throw new Error("Partial material allocation is inexact in physical stock units");
      return { ...material, quantity: stockText(numerator / parent) };
    });
    return { id: child.id, quantity: stockText(quantity), materials };
  });
  if (total !== parent) throw new Error("Children must partition the entire parent output including its remainder");
  return partition;
}
