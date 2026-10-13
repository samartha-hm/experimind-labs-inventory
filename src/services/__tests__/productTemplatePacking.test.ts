import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { normalizeSubjects } from "../ProductTemplateService";
import type { KitPackingUnit } from "../../entity/ProductTemplateVersion";

const activityIds = [randomUUID(), randomUUID()];
const itemId = randomUUID();
const unit = (kind: KitPackingUnit["kind"], children: KitPackingUnit[] = []): KitPackingUnit => ({ id: randomUUID(), kind, name: `${kind} 1`, activity_ids: [], inventory_item_ids: [], children });
function normalize(packing: unknown, activities: unknown = activityIds.map(id => ({ id, name: id, materials: [{ inventory_item_id: itemId, item_name: "Shared component", quantity: 1 }] }))) {
  return normalizeSubjects([{ name: "Science", grades: [{ name: "Grade 8", activities, packing }] }])[0].grades[0];
}

describe("physical packing snapshot", () => {
  it("preserves many-to-many activity links without duplicating educational materials", () => {
    const first = { ...unit("pouch"), activity_ids: activityIds, inventory_item_ids: [itemId] };
    const second = { ...unit("pouch"), name: "Shared pouch", activity_ids: [activityIds[0]] };
    const grade = normalize([unit("box", [unit("partition", [first, second])])]);
    expect(grade.packing?.[0].children[0].children.map(pouch => pouch.activity_ids)).toEqual([activityIds, [activityIds[0]]]);
    expect(grade.activities.map(activity => activity.materials.length)).toEqual([1, 1]);
  });
  it("preserves identifiers and ordering while trimming editable fields", () => {
    const first = { ...unit("box"), name: " Box A ", code: " A ", notes: " fragile " };
    const second = { ...unit("box"), name: "Box B" };
    expect(normalize([second, first]).packing).toEqual([second, { ...first, name: "Box A", code: "A", notes: "fragile" }]);
  });
  it.each([null, {}, "box", [null], [unit("partition")], [unit("box", [unit("pouch")])], [unit("box", [unit("partition", [unit("pouch", [unit("box")])])])]])("rejects malformed hierarchies %#", packing => {
    expect(() => normalize(packing)).toThrow();
  });
  it("rejects duplicate stable identifiers even with different UUID casing", () => {
    const box = unit("box");
    expect(() => normalize([box, { ...box, id: box.id.toUpperCase(), name: "Other" }])).toThrow(/identifiers must be unique/);
  });
  it("rejects activity links outside the owning grade and dangling removal", () => {
    const packing = [unit("box", [unit("partition", [{ ...unit("pouch"), activity_ids: [activityIds[0]] }])])];
    expect(() => normalize(packing, [])).toThrow(/must exist in this grade/);
  });
  it("rejects duplicate assignments and malformed inventory references", () => {
    for (const inventory_item_ids of [[itemId, itemId.toUpperCase()], ["invalid"]])
      expect(() => normalize([{ ...unit("box"), inventory_item_ids }])).toThrow();
    expect(() => normalize([{ ...unit("box"), activity_ids: [activityIds[0]] }])).toThrow(/pouches/);
  });
  it("requires nonempty names and bounded text", () => {
    for (const patch of [{ name: " " }, { code: "a".repeat(51) }, { notes: "a".repeat(2001) }, { notes: 3 }])
      expect(() => normalize([{ ...unit("box"), ...patch }])).toThrow();
  });
  it("supports older snapshots without packing and empty hierarchies", () => {
    expect(normalize([]).packing).toEqual([]);
    expect(normalizeSubjects([{ name: "Maths", grades: [{ name: "Grade 8" }] }])[0].grades[0].packing).toBeUndefined();
  });
  it("bounds hierarchy size and rejects ambiguous sibling names or codes", () => {
    expect(() => normalize(Array.from({ length: 101 }, (_, index) => ({ ...unit("box"), name: `${index}` })))).toThrow();
    expect(() => normalize([unit("box"), { ...unit("box"), name: "BOX 1" }])).toThrow(/names must be unique/);
    expect(() => normalize([{ ...unit("box"), code: "A" }, { ...unit("box"), name: "Other", code: "a" }])).toThrow(/codes must be unique/);
  });
});
