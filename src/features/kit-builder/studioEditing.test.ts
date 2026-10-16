import { afterEach, describe, expect, it, vi } from 'vitest';
import { studioEditingEnabled } from './studioContract';
import { studioSave } from './studioSave';
import { compareKitContent } from './revisionComparison';
import { setApiAuthToken } from '../../utils/api';

afterEach(() => { vi.unstubAllGlobals(); setApiAuthToken(null); });
describe('Explicit Studio editing', () => {
  it('requires a separate editing opt-in and preserves all read gates', () => {
    const env = { NODE_ENV: 'test', KIT_STUDIO_READ_ONLY: 'true', KIT_STUDIO_ORGANIZATIONS: 'org', KIT_STUDIO_DRAFT_EDITING: 'true' };
    expect(studioEditingEnabled('org', env)).toBe(true);
    for (const patch of [{ KIT_STUDIO_DRAFT_EDITING: undefined }, { NODE_ENV: 'production' }, { KIT_STUDIO_READ_ONLY: 'false' }, { KIT_STUDIO_ORGANIZATIONS: 'foreign' }]) expect(studioEditingEnabled('org', { ...env, ...patch })).toBe(false);
  });
  it('does not send unauthenticated writes', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(studioSave('kit', { name: 'Kit', description: '', category: '', subjects: [], revision: 2 })).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 409, 500])('surfaces %s without retrying or overwriting', async status => {
    setApiAuthToken('synthetic');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Actionable server validation' }), { status })); vi.stubGlobal('fetch', fetch);
    await expect(studioSave('kit', { name: 'Kit', description: '', category: '', subjects: [], revision: 2 })).rejects.toMatchObject({ status, message: 'Actionable server validation' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/v1/product-templates/kit/studio', expect.objectContaining({ method: 'PUT', cache: 'no-store', body: expect.stringContaining('"revision":2') }));
  });
  it('compares material precision, ownership, rules, packing mappings and list order', () => {
    const before = { subjects: [{ id: 'science', materials: [{ id: 'm', quantity: 0.125 }], rule: { kind: 'selected_sets' }, packing: { activity_ids: ['a'] } }, { id: 'math', materials: [] }] };
    const after = structuredClone(before); after.subjects.reverse(); after.subjects[1].materials = []; after.subjects[0].materials = [{ id: 'm', quantity: 0.375 }]; after.subjects[1].rule = { kind: 'complete_sets' }; after.subjects[1].packing = { activity_ids: ['b'] };
    const changes = compareKitContent(before, after);
    for (const path of ['subjects / order', 'subjects / science / materials / m / quantity', 'subjects / math / materials / m / quantity', 'subjects / science / rule / kind', 'subjects / science / packing / activity ids / 1']) expect(changes.some(row => row.path === path)).toBe(true);
    expect(compareKitContent(after, structuredClone(after))).toEqual([]);
  });
});
