import { describe, expect, it } from 'vitest';
import { buildOperationsQueue } from '../operationsQueue';

describe('buildOperationsQueue', () => {
  it('counts actionable operational work and ignores closed records', () => {
    const queue = buildOperationsQueue(
      [
        { id: '1', name: 'Low', stockQty: 1, threshold: 2, isCommon: false } as any,
        { id: '2', name: 'Common', stockQty: 0, threshold: 4, isCommon: true } as any,
      ],
      [{ status: 'ORDERED' }, { status: 'RECEIVED' }],
      [{ status: 'PROCESSING' }, { status: 'SHIPPED' }],
      [{ id: 'kit-1' } as any],
    );

    expect(queue).toEqual({
      lowStock: 1,
      replenishment: 1,
      fulfillment: 1,
      projects: 1,
      total: 3,
    });
  });

  it('handles empty operational data', () => {
    expect(buildOperationsQueue([], [], [], [])).toEqual({
      lowStock: 0,
      replenishment: 0,
      fulfillment: 0,
      projects: 0,
      total: 0,
    });
  });

  it('counts normalized in-transit replenishment as actionable work', () => {
    const queue = buildOperationsQueue(
      [],
      [{
        status: 'sent',
        expectedDate: '2026-09-30',
        items: [{ quantity: 10, receivedQty: 0 }],
      }],
      [],
      [],
      new Date('2026-09-23T00:00:00Z'),
    );

    expect(queue.replenishment).toBe(1);
  });
});
