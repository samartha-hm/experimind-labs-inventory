import type { PhysicalPackage } from './packingPlan';
import type { PackingOrder } from './packingTypes';

export const packingWriters = new Set(['admin', 'super_admin', 'manager', 'staff', 'inventory_staff', 'production_staff', 'project_staff', 'editor']);
export function packingExecutionEnabled(org: string, env: Record<string, string | undefined>): boolean {
  return packingWorkspaceEnabled(org, env) && env.PACKING_WORKSPACE_EXECUTION === 'true';
}
/** Restrict this integration to unaccepted package trees; legacy rework remains separate. */
export function packingExecutionBlocker(order: PackingOrder, packageId: string): string | null {
  if (order.status !== 'packing') return 'Active packing required; lifecycle transitions are unavailable here.';
  const ancestry = packageAncestry(order.snapshot.packages, packageId);
  if (!ancestry.length) return 'Package not found';
  if (ancestry.some(p => order.execution.progress[p.id]?.qc === 'accepted')) return 'Accepted package or ancestor protected; reviewed rework is required.';
  return null;
}

export function packingWorkspaceEnabled(org: string, env: Record<string, string | undefined>): boolean {
  return ['development', 'test'].includes(env.NODE_ENV ?? '') && env.PACKING_WORKSPACE_READ_ONLY === 'true'
    && !!org && (env.PACKING_WORKSPACE_ORGANIZATIONS ?? '').split(',').map(s => s.trim()).includes(org);
}

/** Only known label formats; never navigate to a scanned URL or trust its ownership. */
export function packageLookupId(value: string, origin: string): string {
  let id = value.trim();
  if (/^https?:/i.test(id)) {
    const url = new URL(id);
    if (url.origin !== origin || url.pathname !== '/' || url.username || url.password || url.hash
      || [...url.searchParams.keys()].some(k => k !== 'packing_package') || url.searchParams.getAll('packing_package').length !== 1) throw new Error('Use a package label from this ERP origin.');
    id = url.searchParams.get('packing_package') ?? '';
  } else id = id.replace(/^PK-/i, '');
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)) throw new Error('Unknown label format. Enter a package UUID, PK code or ERP label URL.');
  return id.toLowerCase();
}

export function packageAncestry(packages: PhysicalPackage[], id: string): PhysicalPackage[] {
  const byId = new Map(packages.map(p => [p.id, p])), seen = new Set<string>(), result: PhysicalPackage[] = [];
  let current = byId.get(id);
  while (current && !seen.has(current.id)) {
    seen.add(current.id); result.unshift(current); current = current.parent_id ? byId.get(current.parent_id) : undefined;
  }
  return result;
}
