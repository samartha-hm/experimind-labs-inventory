import { describe, expect, it } from 'vitest';
import { stockStatus, summarizeInventory } from '../inventorySnapshot';
import type { InventoryItem } from '../../../types';

const item = (stockQty: number, threshold = 10, isCommon = false): InventoryItem => ({
  id: 'part', name: 'Part', category: 'Parts', unit: 'pcs', stockQty, threshold, isCommon,
});

describe('inventory snapshot signals', () => {
  it('uses the configured strict threshold, including zero and fractional quantities', () => {
    expect(stockStatus(item(10))).toBe('ok');
    expect(stockStatus(item(9.5))).toBe('low');
    expect(stockStatus(item(0, 0))).toBe('out');
    expect(stockStatus(item(1, 0))).toBe('ok');
  });
  it('does not classify unlimited common items as shortages', () => {
    expect(stockStatus(item(0, 10, true))).toBe('unlimited');
  });
  it.each([item(-1), item(NaN), item(Infinity), item(4, -1), item(4, NaN)])('flags invalid source values (%j)', value => {
    expect(stockStatus(value)).toBe('invalid');
  });
  it('counts SKU signals without summing incompatible units or mutating source data', () => {
    const records = [item(0), item(3), item(10), item(0, 10, true), item(-2)];
    expect(summarizeInventory(records)).toEqual({ total: 5, out: 1, low: 1, ok: 1, unlimited: 1, invalid: 1 });
    expect(records[4].stockQty).toBe(-2);
    expect(summarizeInventory([]).total).toBe(0);
  });
});
