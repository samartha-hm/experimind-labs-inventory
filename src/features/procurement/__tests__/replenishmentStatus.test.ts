import { describe, expect, it } from 'vitest';
import { summarizeReplenishmentOrder } from '../replenishmentStatus';

describe('summarizeReplenishmentOrder', () => {
  const today = new Date('2026-09-23T00:00:00Z');

  it('identifies an in-transit order with remaining quantity', () => {
    expect(summarizeReplenishmentOrder({
      status: 'sent',
      expectedDate: '2026-09-30',
      items: [{ quantity: 10, receivedQty: 0 }],
    }, today)).toMatchObject({
      status: 'in_transit',
      orderedQty: 10,
      receivedQty: 0,
      remainingQty: 10,
      isOverdue: false,
    });
  });

  it('identifies partial delivery and backorder states', () => {
    expect(summarizeReplenishmentOrder({
      status: 'sent',
      expectedDate: '2026-09-20',
      items: [{ quantity: 10, receivedQty: 4 }],
    }, today)).toMatchObject({
      status: 'backordered',
      orderedQty: 10,
      receivedQty: 4,
      remainingQty: 6,
      isOverdue: true,
    });
  });

  it('closes an order only when every quantity is received', () => {
    expect(summarizeReplenishmentOrder({
      status: 'sent',
      items: [{ quantity: 10, receivedQty: 10 }],
    }, today).status).toBe('received');
  });
});
