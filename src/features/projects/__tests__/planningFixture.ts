import { randomUUID } from "node:crypto";
import type { KitSubject } from "../../../entity/ProductTemplateVersion";
import type { PlanningContent } from "../planningTypes";

export function planningFixture(itemId: string = randomUUID(), versionId: string = randomUUID()) {
  const subjectId = randomUUID(); const gradeIds = [randomUUID(), randomUUID(), randomUUID()];
  const mathId = randomUUID(); const mathGradeId = randomUUID(); const universalId = randomUUID();
  const subjects: KitSubject[] = [{ id: subjectId, name: "Science", grades: gradeIds.map((id, i) => {
    const activityId = randomUUID();
    return { id, name: `Grade ${8 + i}`, activities: [{ id: activityId, name: `Activity ${8 + i}`,
      materials: [{ id: randomUUID(), inventory_item_id: itemId, item_name: "Shared wire", quantity: 0.1, unit: "m", reusable: true }] }],
      packing: [{ id: randomUUID(), name: "Activity Box 1", kind: "box", activity_ids: [], inventory_item_ids: [],
        children: [{ id: randomUUID(), name: "Partition 1", kind: "partition", activity_ids: [], inventory_item_ids: [],
          children: [1, 2].map(n => ({ id: randomUUID(), name: `Pouch ${n}`, kind: "pouch" as const,
            activity_ids: [activityId], inventory_item_ids: [itemId], children: [] })) }] }] };
  }), crates: [
    ...gradeIds.map((grade_id, i) => ({ id: randomUUID(), name: `Grade ${8 + i} common crate`, kind: "common" as const,
      materials: [{ id: randomUUID(), inventory_item_id: itemId, item_name: "Shared wire", quantity: 0.2, unit: "m" }],
      rule: { kind: "selected_sets" as const, components: [{ subject_id: subjectId, grade_id, quantity: 1 }] } })),
    { id: universalId, name: "Universal crate", kind: "universal", reusable: true,
      materials: [{ id: randomUUID(), inventory_item_id: itemId, item_name: "Shared wire", quantity: 0.3, unit: "m" }],
      rule: { kind: "complete_sets", components: gradeIds.map(grade_id => ({ subject_id: subjectId, grade_id, quantity: 1 })) } },
  ] }, { id: mathId, name: "Mathematics", grades: [{ id: mathGradeId, name: "Grade 8", activities: [{ id: randomUUID(), name: "Math activity",
    materials: [{ id: randomUUID(), inventory_item_id: itemId, item_name: "Shared wire", quantity: 0.4, unit: "m" }] }] }] }];
  const site = (name: string, counts: Record<string, number>, complete: number) => ({ id: randomUUID(), name, address: "", location: "", contact: "", notes: "", schedule: "Term 1", fulfillment: "School delivery",
    selections: [{ id: randomUUID(), version_id: versionId, context: { grade_quantities: counts, complete_sets: { [universalId]: complete } } }] });
  const content: PlanningContent = { name: "NGO Prastuti project", client: "Synthetic NGO", notes: "", commercial_links: [], overrides: {},
    sites: [site("School A", Object.fromEntries(gradeIds.map(id => [id, 2])), 2), site("School B", { [gradeIds[0]]: 3 }, 0)] };
  return { itemId, versionId, subjectId, gradeIds, mathId, mathGradeId, universalId, subjects, content,
    version: { id: versionId, name: "Prastuti acceptance", version_number: 2, subjects }, items: [{ id: itemId, name: "Shared wire", unit: "m" }] };
}
