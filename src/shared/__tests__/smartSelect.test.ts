import { describe, it, expect } from 'vitest';
import { normalizeSelectOptions, SelectOption } from '../components/SmartSelect';

describe('SmartSelect normalization and option handling', () => {
  it('normalizes string array to SelectOption array', () => {
    const raw = ['All', 'Active', 'Archived'];
    const normalized = normalizeSelectOptions(raw);

    expect(normalized).toEqual([
      { value: 'All', label: 'All' },
      { value: 'Active', label: 'Active' },
      { value: 'Archived', label: 'Archived' },
    ]);
  });

  it('preserves already structured SelectOption items', () => {
    const raw: SelectOption[] = [
      { value: 'wh-1', label: 'Central Hub', badge: 'Active' },
      { value: 'wh-2', label: 'Secondary Depot', disabled: true },
    ];
    const normalized = normalizeSelectOptions(raw);

    expect(normalized).toHaveLength(2);
    expect(normalized[0].badge).toBe('Active');
    expect(normalized[1].disabled).toBe(true);
  });

  it('handles mixed array of strings and SelectOption objects', () => {
    const raw = [
      'All Categories',
      { value: 'elec', label: 'Electronics', badge: 'High Priority' },
      'Mechanical',
    ];
    const normalized = normalizeSelectOptions(raw);

    expect(normalized).toHaveLength(3);
    expect(normalized[0]).toEqual({ value: 'All Categories', label: 'All Categories' });
    expect(normalized[1].value).toBe('elec');
    expect(normalized[2]).toEqual({ value: 'Mechanical', label: 'Mechanical' });
  });

  it('filters options case-insensitively by label or value', () => {
    const options: SelectOption[] = [
      { value: 'pending', label: 'Pending Approval' },
      { value: 'approved', label: 'Approved Order' },
      { value: 'rejected', label: 'Rejected Request' },
    ];

    const q = 'order';
    const filtered = options.filter(
      (opt) => opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe('approved');
  });
});
