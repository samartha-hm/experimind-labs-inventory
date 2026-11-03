import { describe, expect, it } from 'vitest';
import { parseDeliveryRequest } from './deliveryRecovery';

describe('delivery saved request recovery', () => {
  const request = { path: '/operator/delivery/acknowledgments', key: 'original-idempotency-key', input: { roots: ['original-root'] } };
  it('preserves the original key and payload for an unchanged retry', () => {
    expect(parseDeliveryRequest(JSON.stringify(request))).toEqual(request);
  });
  it.each(['null', '[]', '{', JSON.stringify({ ...request, path: '/operator/stocktake' }),
    JSON.stringify({ ...request, path: request.path + '?override=1' }),
    JSON.stringify({ ...request, key: '' }), JSON.stringify({ ...request, input: [] }),
    JSON.stringify({ ...request, actor: 'forged' })])('rejects unsafe saved data: %s', saved => {
    expect(() => parseDeliveryRequest(saved)).toThrow();
  });
});
