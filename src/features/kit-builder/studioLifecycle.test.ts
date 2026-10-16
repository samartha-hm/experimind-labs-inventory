import { afterEach, describe, expect, it, vi } from 'vitest';
import { reviewKit } from './studioReview';
import { studioApprove } from './studioApprove';
import { setApiAuthToken } from '../../utils/api';
import type { KitSubject } from '../../entity/ProductTemplateVersion';

afterEach(() => { vi.unstubAllGlobals(); setApiAuthToken(null); });
describe('Studio lifecycle', () => {
  it('separates completeness blockers from packing warnings without changing quantities', () => {
    const subjects: KitSubject[] = [{ id: 's', name: 'Science', grades: [{ id: 'g', name: '8', activities: [{ id: 'a', name: 'Measurement', materials: [{ id: 'm', inventory_item_id: 'item', item_name: 'Wire', unit: 'm', quantity: 0.125 }] }], packing: [{ id: 'p', kind: 'pouch', name: 'Shared', activity_ids: ['a'], inventory_item_ids: ['item'], children: [] }] }] }];
    const before = structuredClone(subjects);
    expect(reviewKit(subjects)).toMatchObject({ issues: [], materials: 1, packing: 1 });
    expect(subjects).toEqual(before);
    subjects[0].grades[0].activities[0].materials[0].quantity = 0;
    subjects[0].grades[0].packing = [];
    expect(reviewKit(subjects).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ target: 'review-m', severity: 'error' }),
      expect.objectContaining({ target: 'review-m', severity: 'warning' }),
    ]));
    expect(reviewKit([]).issues[0]).toMatchObject({ target: 'review-structure', severity: 'error' });
  });
  it('never submits without authentication', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(studioApprove('kit', 1)).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([400, 401, 403, 404, 409, 500])('surfaces %s without replaying approval', async status => {
    setApiAuthToken('synthetic');
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Refresh saved revision' }), { status }));
    vi.stubGlobal('fetch', fetch);
    await expect(studioApprove('kit', 7)).rejects.toMatchObject({ status, message: 'Refresh saved revision' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('/api/v1/product-templates/kit/studio/approve', expect.objectContaining({ method: 'POST', body: '{"revision":7}', cache: 'no-store' }));
  });
  it('does not replay an uncertain network response', async () => {
    setApiAuthToken('synthetic');
    const fetch = vi.fn().mockRejectedValue(new TypeError('Network unavailable')); vi.stubGlobal('fetch', fetch);
    await expect(studioApprove('kit', 1)).rejects.toThrow('Network unavailable');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
