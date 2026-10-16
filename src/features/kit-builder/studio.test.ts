import { afterEach, describe, expect, it, vi } from 'vitest';
import { materialQuantity, studioEnabled } from './studioContract';
import { studioRead } from './studioRead';
import { setApiAuthToken } from '../../utils/api';

afterEach(() => { vi.unstubAllGlobals(); setApiAuthToken(null); });
describe('Live Studio contracts', () => {
  it('fails closed outside explicit development organizations', () => {
    const enabled = { NODE_ENV: 'development', KIT_STUDIO_READ_ONLY: 'true', KIT_STUDIO_ORGANIZATIONS: 'org-a, org-b' };
    expect(studioEnabled('org-b', enabled)).toBe(true);
    for (const environment of [{}, { ...enabled, NODE_ENV: 'production' }, { ...enabled, KIT_STUDIO_READ_ONLY: 'false' }, { ...enabled, KIT_STUDIO_ORGANIZATIONS: '' }]) expect(studioEnabled('org-a', environment)).toBe(false);
    expect(studioEnabled('foreign', enabled)).toBe(false);
  });
  it('preserves explicit zero and refuses missing/incomplete quantities', () => {
    expect(materialQuantity({ quantity: 0, inventory_item_id: 'item', unit: 'pcs' })).toBe('0 pcs');
    for (const value of [{}, { quantity: 0 }, { quantity: NaN, inventory_item_id: 'item', unit: 'pcs' }, { quantity: 3, complete: false, inventory_item_id: 'item', unit: 'pcs' }]) expect(materialQuantity(value)).toContain('Unavailable');
  });
  it('requires authentication without sending a request', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(studioRead('/studio', new AbortController().signal)).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([401, 403, 404, 409, 500])('surfaces HTTP %s without synthetic fallback or refresh writes', async status => {
    setApiAuthToken('synthetic-test-token');
    const fetch = vi.fn().mockResolvedValue(new Response('{}', { status })); vi.stubGlobal('fetch', fetch);
    const signal = new AbortController().signal;
    await expect(studioRead('/studio', signal)).rejects.toMatchObject({ status });
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/api/v1/product-templates/studio', expect.objectContaining({ method: 'GET', cache: 'no-store', signal }));
  });
});
