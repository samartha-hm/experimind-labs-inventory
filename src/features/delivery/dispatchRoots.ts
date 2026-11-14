import type { PackingSnapshot } from "../packing/packingPlan";

/** Dispatch each physical branch below a batch, including standalone common crates. */
export function dispatchRoots(packages: PackingSnapshot["packages"]) {
  const batches = new Set(packages.filter(p => p.kind === "batch").map(p => p.id));
  return packages.filter(p => p.kind !== "batch" && (!p.parent_id || batches.has(p.parent_id)));
}
