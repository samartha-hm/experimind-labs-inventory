import { describe, it, expect } from 'vitest';
import { packageAncestry, packageLookupId, packingWorkspaceEnabled, packingExecutionEnabled, packingExecutionBlocker } from '../workspaceContract';
import type { PhysicalPackage } from '../packingPlan';
const id = '12345678-1234-1234-1234-123456789abc', origin = 'https://erp.test';
describe('Packing workspace safety contracts', () => {
  it('requires a separate development flag and exact tenant allowlist', () => {
    const env = { NODE_ENV: 'development', PACKING_WORKSPACE_READ_ONLY: 'true', PACKING_WORKSPACE_ORGANIZATIONS: 'org-a, org-b' };
    expect(packingWorkspaceEnabled('org-a', env)).toBe(true);
    for (const patch of [{ NODE_ENV: 'production' }, { PACKING_WORKSPACE_READ_ONLY: 'false' }, { PACKING_WORKSPACE_ORGANIZATIONS: 'org-aa' }]) expect(packingWorkspaceEnabled('org-a', { ...env, ...patch })).toBe(false);
    expect(packingWorkspaceEnabled('', env)).toBe(false);
  });
  it('requires an additional execution flag and protects accepted ancestors', () => {
    const env = { NODE_ENV: 'test', PACKING_WORKSPACE_READ_ONLY: 'true', PACKING_WORKSPACE_ORGANIZATIONS: 'org' };
    expect(packingExecutionEnabled('org', env)).toBe(false);
    expect(packingExecutionEnabled('org', { ...env, PACKING_WORKSPACE_EXECUTION: 'true' })).toBe(true);
    expect(packingExecutionEnabled('org', { ...env, NODE_ENV: 'production', PACKING_WORKSPACE_EXECUTION: 'true' })).toBe(false);
    const order = { status: 'packing', snapshot: { packages: [{ id: 'parent', parent_id: null }, { id: 'child', parent_id: 'parent' }] }, execution: { progress: {} } } as unknown as import('../packingTypes').PackingOrder;
    expect(packingExecutionBlocker(order, 'child')).toBe(null);
    order.execution.progress.parent = { qc: 'accepted' } as typeof order.execution.progress[string];
    expect(packingExecutionBlocker(order, 'child')).toMatch(/Accepted/);
    expect(packingExecutionBlocker(order, 'parent')).toMatch(/Accepted/);
    expect(packingExecutionBlocker(order, 'unknown')).toMatch(/not found/);
    order.status = 'ready'; expect(packingExecutionBlocker(order, 'child')).toMatch(/Active packing/);
  });
  it('accepts only package identities and same-origin label destinations', () => {
    for (const value of [id, `PK-${id.toUpperCase()}`, `${origin}/?packing_package=${id}`]) expect(packageLookupId(value, origin)).toBe(id);
    for (const value of ['unknown', `https://foreign.test/?packing_package=${id}`, `${origin}/other?packing_package=${id}`, `${origin}/?packing_package=${id}&packing_package=${id}`, `${origin}/?packing_package=${id}&role=admin`, `javascript:alert(1)`]) expect(() => packageLookupId(value, origin)).toThrow();
  });
  it('walks the authoritative parent hierarchy and terminates on malformed cycles', () => {
    const a = { id: 'a', parent_id: null } as PhysicalPackage, b = { id: 'b', parent_id: 'a' } as PhysicalPackage;
    expect(packageAncestry([a, b], 'b').map(p => p.id)).toEqual(['a', 'b']);
    expect(packageAncestry([{ ...a, parent_id: 'b' }, b], 'b')).toHaveLength(2);
    expect(packageAncestry([a], 'unknown')).toEqual([]);
  });
});
