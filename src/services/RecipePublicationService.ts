import { randomUUID } from "node:crypto";
import type { EntityManager } from "typeorm";
import type { RecipeDefinition } from "../entity/ProductionPlanning";
import type { LedgerContext } from "./CommitmentLedgerService";
import { recipeMaterialBudget } from "../features/production/recipeMaterialBudget";
import { stockText, stockUnits } from "../features/inventory/physicalQuantity";

export interface RecipePublication {
  name: string;
  definition: RecipeDefinition;
  /** A new family has no predecessor. Updates always publish a new immutable version. */
  predecessor?: string;
}
export interface PublishedRecipe { id: string; family: string; version: number; }

/** Called only inside the capability writer transaction; never changes stock or demand. */
export async function publishRecipe(m: EntityManager, context: LedgerContext,
  input: RecipePublication, key: string): Promise<PublishedRecipe> {
  if (!input || typeof input.name !== "string" || !input.name.trim() || input.name.length > 200)
    throw new Error("Recipe name required");
  const raw = input.definition;
  if (!raw || !Array.isArray(raw.inputs) || !raw.inputs.length || raw.inputs.length > 100)
    throw new Error("One to 100 canonical recipe inputs required");
  const ids = [raw.output_item_id, ...raw.inputs.map(i => i?.item_id)];
  if (ids.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)))
    throw new Error("Inventory identities required");
  const items: { id: string; unit: string }[] = await m.query(
    "SELECT id,unit FROM inventory_items WHERE organization_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR SHARE",
    [context.organization, ids]);
  const units = Object.fromEntries(items.map(i => [i.id, i.unit]));
  if (ids.some(id => !units[id])) throw new Error("Tenant inventory item not found");
  const definition: RecipeDefinition = {
    output_item_id: raw.output_item_id, unit: raw.unit,
    yield_quantity: stockText(stockUnits(raw.yield_quantity)),
    inputs: raw.inputs.map(i => {
      // This first publication contract accepts canonical inventory units only.
      // Never trust client-supplied conversion factors or canonical quantities.
      if (i.unit !== units[i.item_id] || i.conversion_id !== undefined || i.conversion_factor !== undefined)
        throw new Error("Publish recipe inputs in canonical inventory units");
      const quantity = stockText(stockUnits(i.quantity));
      if (i.canonical_quantity !== undefined && stockUnits(i.canonical_quantity) !== stockUnits(quantity))
        throw new Error("Recipe canonical quantity mismatch");
      return { item_id: i.item_id, unit: i.unit, quantity, canonical_quantity: quantity,
        scrap_percent: stockText(stockUnits(i.scrap_percent ?? "0")) };
    }),
    instructions: raw.instructions ?? "", specification: raw.specification ?? "", concentration: raw.concentration ?? "",
  };
  for (const note of [definition.instructions, definition.specification, definition.concentration])
    if (typeof note !== "string" || note.length > 5000) throw new Error("Invalid recipe notes");
  recipeMaterialBudget(definition, definition.yield_quantity, units);
  let family = randomUUID(), version = 1;
  if (input.predecessor !== undefined) {
    const [prior] = await m.query("SELECT family_id,version FROM production_recipes WHERE id=$1 AND organization_id=$2 AND authority_key IS NOT NULL",
      [input.predecessor, context.organization]);
    if (!prior) throw new Error("Trusted predecessor not found");
    family = prior.family_id; version = prior.version + 1;
  }
  await m.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`recipe:${context.organization}:${family}`]);
  const id = randomUUID();
  await m.query(`INSERT INTO production_recipes(id,organization_id,family_id,version,revision,name,status,definition,created_by,approved_by,authority_key)
    VALUES($1,$2,$3,$4,1,$5,'approved',$6::jsonb,$7,$7,$8)`,
    [id, context.organization, family, version, input.name.trim(), JSON.stringify(definition), context.actor, key]);
  return { id, family, version };
}
