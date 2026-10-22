import type { PhysicalPackage, PackingSnapshot } from '../packing/packingPlan';

/** A grade or crate is one approved school slot; wrappers never add entitlement. */
export interface DeliverableSlot {
  package: string;
  selection: string;
  kind: 'grade' | 'crate';
  definition: string;
  ordinal: number;
}
export interface DispatchAssembly {
  roots: string[];
  packages: PhysicalPackage[];
  slots: DeliverableSlot[];
}

/** Only whole kit roots may leave custody. Pouches and crates travel with the kit. */
export function dispatchAssembly(snapshot: PackingSnapshot, roots: readonly string[]): DispatchAssembly {
  if (!roots.length || roots.length > 500 || new Set(roots).size !== roots.length)
    throw Error('Choose distinct complete kit assemblies');
  const byId = new Map(snapshot.packages.map(p => [p.id, p]));
  if (byId.size !== snapshot.packages.length) throw Error('Ambiguous physical package identity');
  for (const id of roots) {
    const root = byId.get(id);
    if (!root || root.kind !== 'kit') throw Error('Dispatch requires complete kit assemblies');
    const batch = root.parent_id && byId.get(root.parent_id);
    if (!batch || batch.kind !== 'batch' || batch.parent_id !== null)
      throw Error('Ambiguous kit parent identity');
    if(batch.selection_id!==root.selection_id||batch.version_id!==root.version_id)
      throw Error('Mixed approved assembly lineage');
  }
  const selected = new Set(roots);
  const packages = snapshot.packages.filter(p => {
    const visited = new Set<string>();
    let current: PhysicalPackage | undefined = p;
    while (current) {
      if (visited.has(current.id)) throw Error('Cyclic package hierarchy');
      visited.add(current.id);
      if (selected.has(current.id)) return true;
      if (current.parent_id === null) return false;
      const parent = byId.get(current.parent_id);
      if (!parent) throw Error('Missing package parent');
      if (parent.selection_id !== current.selection_id || parent.version_id !== current.version_id)
        throw Error('Mixed approved assembly lineage');
      current = parent;
    }
    return false;
  });
  const slots: DeliverableSlot[] = packages.flatMap(p => p.kind === 'grade' || p.kind==='common_crate' || p.kind==='universal_crate'
    ? [{ package: p.id, selection: p.selection_id, kind: p.kind === 'grade' ? 'grade' as const : 'crate' as const,
      definition: p.definition_id, ordinal: p.pack_number }]
    : []);
  if (!slots.length || slots.some(s => !Number.isSafeInteger(s.ordinal) || s.ordinal < 1))
    throw Error('Complete frozen school entitlement required');
  const identities = slots.map(s => `${s.selection}:${s.kind}:${s.definition}:${s.ordinal}`);
  if (new Set(identities).size !== identities.length) throw Error('Repeated school entitlement');
  for (const id of roots) {
    if (!packages.some(p => p.kind === 'grade' && ancestorIs(p, id, byId)))
      throw Error('Kit has no school grade entitlement');
  }
  return { roots: [...roots], packages, slots };
}

function ancestorIs(p: PhysicalPackage, id: string, byId: Map<string, PhysicalPackage>): boolean {
  let current: PhysicalPackage | undefined = p;
  while (current) {
    if (current.id === id) return true;
    current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return false;
}
