import type { TrustedPackingView } from '../packing/trustedPackingTypes';
import type { TrustedDeliveryView } from './trustedDeliveryTypes';

/** Resolve only loaded, tenant-authorized evidence; never fetch a scanned URL. */
export function trustedDeliveryLookup(input: string, origin: string, packing: TrustedPackingView, delivery: TrustedDeliveryView, projectId?: string) {
  let id = input.trim();
  if (/^https?:\/\//i.test(id)) {
    const url = new URL(id);
    if (url.origin !== new URL(origin).origin || url.username || url.password || url.pathname !== '/' || url.searchParams.getAll('trusted_packing_package').length !== 1)
      throw Error('Use a package label from this ERP');
    id = url.searchParams.get('trusted_packing_package') ?? '';
  }
  id = id.replace(/^PK-/i, '').toLowerCase();
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)) throw Error('Invalid package label');
  const plans = packing.plans.filter(p => !projectId || p.project_id === projectId);
  const dispatches = delivery.dispatches.filter(d => !projectId || d.project_id === projectId);
  const candidates = [
    ...plans.map(p => ({planId:p.id, projectId:p.project_id, snapshot:p.snapshot})),
    ...dispatches.map(d => ({planId:d.plan_id, projectId:d.project_id, snapshot:d.snapshot})),
  ];
  const matches = candidates.filter(p => p.snapshot.packages.some(unit => unit.id.toLowerCase() === id));
  if (!matches.length) throw Error('Package unavailable for this tenant. Verify the label or refresh.');
  const resolved = matches.map(p => {
    const seen = new Set<string>();
    let unit = p.snapshot.packages.find(unit => unit.id.toLowerCase() === id);
    while (unit && unit.kind !== 'kit') {
      if (seen.has(unit.id)) throw Error('Ambiguous package hierarchy');
      seen.add(unit.id);
      unit = p.snapshot.packages.find(parent => parent.id === unit!.parent_id);
    }
    if (!unit) throw Error('Select a package inside a complete kit assembly');
    return {planId:p.planId, projectId:p.projectId, root:unit.id, siteName:p.snapshot.site_name};
  });
  const match = resolved[0];
  if (resolved.some(p => p.planId !== match.planId || p.projectId !== match.projectId || p.root !== match.root)) throw Error('Ambiguous package identity');
  const dispatched = dispatches.filter(d => d.plan_id === match.planId && d.roots.includes(match.root));
  if (dispatched.length > 1) throw Error('Ambiguous dispatch custody');
  return {...match, dispatchId:dispatched[0]?.id ?? ''};
}
