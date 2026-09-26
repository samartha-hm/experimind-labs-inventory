import { describe, expect, it } from 'vitest';
import {
  computePoTotal,
  generatePoNumber,
  poStatusAfterApproval,
  resolvePoApproval,
  validatePoDraft,
  type POLineItemDraft,
  type PoDraft,
} from '../poCreation';

const line = (itemId: string, quantity: number, unitPrice: number): POLineItemDraft => ({
  itemId,
  name: `Item ${itemId}`,
  quantity,
  unitPrice,
});

const baseDraft = (overrides: Partial<PoDraft> = {}): PoDraft => ({
  vendorName: 'Acme Supplies',
  expectedDate: '2026-10-01',
  lineItems: [line('itm_1', 10, 250)],
  ...overrides,
});

describe('computePoTotal', () => {
  it('sums quantity * unitPrice across line items', () => {
    expect(computePoTotal([line('a', 10, 250), line('b', 3, 99.5)])).toBe(2798.5);
  });

  it('returns 0 for an empty line-item list', () => {
    expect(computePoTotal([])).toBe(0);
  });

  it('rounds to 2 decimal places to avoid float drift', () => {
    expect(computePoTotal([line('a', 3, 0.1), line('b', 3, 0.2)])).toBe(0.9);
  });
});

describe('generatePoNumber', () => {
  it('produces PO-<year>-0001 when no orders exist', () => {
    expect(generatePoNumber([], new Date('2026-03-15'))).toBe('PO-2026-0001');
  });

  it('increments the highest sequence for the current year', () => {
    const existing = ['PO-2026-0001', 'PO-2026-0007', 'PO-2025-0450'];
    expect(generatePoNumber(existing, new Date('2026-03-15'))).toBe('PO-2026-0008');
  });

  it('rolls the sequence back to 1 in a new year', () => {
    const existing = ['PO-2025-0450'];
    expect(generatePoNumber(existing, new Date('2026-01-02'))).toBe('PO-2026-0001');
  });

  it('never collides even with out-of-order or gappy existing numbers', () => {
    const existing = ['PO-2026-0009', 'PO-2026-0002'];
    expect(generatePoNumber(existing, new Date('2026-05-05'))).toBe('PO-2026-0010');
  });

  it('ignores strings that do not match the PO-<year>-<seq> pattern', () => {
    const existing = ['PO-2026-0', 'PO-old', '2026-0005', 'PO-2026-XXXX'];
    expect(generatePoNumber(existing, new Date('2026-05-05'))).toBe('PO-2026-0001');
  });
});

describe('resolvePoApproval', () => {
  const thresholds = { poTier1Threshold: 25000, poTier2Threshold: 100000 };

  it('requires no approval below the tier-1 threshold', () => {
    expect(resolvePoApproval(24999, thresholds)).toEqual({
      requiresApproval: false,
      requiredTier: null,
    });
  });

  it('routes to tier1 at or above the tier-1 threshold', () => {
    expect(resolvePoApproval(25000, thresholds)).toEqual({
      requiresApproval: true,
      requiredTier: 'tier1_procurement',
    });
  });

  it('routes to tier2 at or above the tier-2 threshold', () => {
    expect(resolvePoApproval(100000, thresholds)).toEqual({
      requiresApproval: true,
      requiredTier: 'tier2_finance_admin',
    });
  });
});

describe('poStatusAfterApproval', () => {
  it('maps approval to issued', () => {
    expect(poStatusAfterApproval('approved')).toBe('issued');
  });

  it('maps rejection to cancelled', () => {
    expect(poStatusAfterApproval('rejected')).toBe('cancelled');
  });
});

describe('validatePoDraft', () => {
  it('passes a valid draft', () => {
    expect(validatePoDraft(baseDraft())).toEqual([]);
  });

  it('requires a vendor', () => {
    expect(validatePoDraft(baseDraft({ vendorName: '' }))).toContain('Vendor is required');
  });

  it('requires an expected date', () => {
    expect(validatePoDraft(baseDraft({ expectedDate: '' }))).toContain('Expected date is required');
  });

  it('requires at least one line item', () => {
    expect(validatePoDraft(baseDraft({ lineItems: [] }))).toContain('Add at least one line item');
  });

  it('requires a positive quantity', () => {
    expect(validatePoDraft(baseDraft({ lineItems: [line('a', 0, 100)] }))).toContain(
      'Each line item needs a quantity of at least 1',
    );
  });

  it('requires a unit price greater than zero', () => {
    expect(validatePoDraft(baseDraft({ lineItems: [line('a', 2, 0)] }))).toContain(
      'Each line item needs a unit price greater than 0',
    );
  });
});
