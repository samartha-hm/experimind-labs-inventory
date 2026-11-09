import type { KitSubject } from '../../entity/ProductTemplateVersion';

/** Keep the calculation text intact while making known grade references readable. */
export function planningTraceLabel(basis: string, subjects: KitSubject[]): string {
  const grades = new Map(subjects.flatMap(subject => subject.grades.map(grade => [grade.id, `${subject.name} / ${grade.name}`] as const)));
  return basis.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, id => grades.get(id) ?? id);
}
