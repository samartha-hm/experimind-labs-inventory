import type { KitMaterial, KitPackingUnit, KitSubject } from '../../entity/ProductTemplateVersion';

export interface ReviewIssue { target: string; severity: 'error' | 'warning'; message: string }
export const reviewTarget = (id: string) => `review-${id}`;

// Advisory completeness only. Approval still normalizes and validates references on the server.
// Packing warnings never change allocation or infer quantity rules.
export function reviewKit(subjects: KitSubject[]) {
  const issues: ReviewIssue[] = [];
  let grades = 0, activities = 0, materials = 0, packing = 0;
  const add = (id: string, severity: ReviewIssue['severity'], message: string) => issues.push({ target: reviewTarget(id), severity, message });
  const check = (rows: KitMaterial[], ownerId: string, owner: string, mapped?: Set<string>) => {
    for (const row of rows) {
      materials++;
      if (!row.inventory_item_id || !row.unit?.trim() || !Number.isFinite(row.quantity) || row.quantity <= 0)
        add(row.id, 'error', `${owner} / ${row.item_name || 'Material'}: select an inventory item, unit and positive quantity.`);
      if (mapped && !mapped.has(row.inventory_item_id)) add(row.id, 'warning', `${owner} / ${row.item_name}: no physical packing mapping.`);
    }
    if (!rows.length) add(ownerId, 'warning', `${owner}: no materials configured.`);
  };
  if (!subjects.some(s => s.grades.length)) add('structure', 'error', 'Configure subjects and at least one grade before approval.');
  for (const subject of subjects) {
    for (const grade of subject.grades) {
      grades++;
      const mapped = new Set<string>();
      const walk = (units: KitPackingUnit[]) => units.forEach(unit => {
        packing++;
        unit.inventory_item_ids.forEach(id => mapped.add(id));
        if (!unit.activity_ids.length && !unit.inventory_item_ids.length) add(unit.id, 'warning', `${grade.name} / ${unit.name}: no direct mappings; check child locations.`);
        walk(unit.children ?? []);
      });
      walk(grade.packing ?? []);
      if (!grade.activities?.length) add(grade.id, 'warning', `${subject.name} / ${grade.name}: no activities configured.`);
      for (const activity of grade.activities ?? []) {
        activities++;
        check(activity.materials, activity.id, `${subject.name} / ${grade.name} / ${activity.name}`, mapped);
      }
    }
    for (const crate of subject.crates ?? []) check(crate.materials, crate.id, `${subject.name} / ${crate.name}`);
  }
  return { issues, subjects: subjects.length, grades, activities, materials, packing };
}
