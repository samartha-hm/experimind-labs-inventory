import { expect, it } from "vitest";
import { dispatchRoots } from "../dispatchRoots";
import type { PackingSnapshot } from "../../packing/packingPlan";

it("offers standalone common crates alongside kits without separately dispatching their descendants", () => {
  const packages = [
    { id: "batch", parent_id: null, kind: "batch" },
    { id: "kit", parent_id: "batch", kind: "kit" },
    { id: "common", parent_id: "batch", kind: "common_crate" },
    { id: "universal", parent_id: "kit", kind: "universal_crate" },
    { id: "box", parent_id: "kit", kind: "box" },
    { id: "pouch", parent_id: "box", kind: "pouch" },
  ] as PackingSnapshot["packages"];
  expect(dispatchRoots(packages).map(p => p.id)).toEqual(["kit", "common"]);
});
