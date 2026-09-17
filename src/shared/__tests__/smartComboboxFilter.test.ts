import { describe, it, expect } from 'vitest';
import { ComboboxOption } from '../components/SmartCombobox';

// Extracted search filtering function mirroring SmartCombobox matching logic
function filterComboboxOptions(options: ComboboxOption[], searchQuery: string): ComboboxOption[] {
  if (!searchQuery.trim()) return options;

  const terms = searchQuery.toLowerCase().trim().split(/\s+/);
  return options.filter((option) => {
    const targetStr = [
      option.label,
      option.value,
      option.subtitle,
      option.badge,
      option.category,
      option.sku,
      option.binLocation
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return terms.every((term) => targetStr.includes(term));
  });
}

describe('SmartCombobox Multi-Attribute Filter Logic', () => {
  const mockOptions: ComboboxOption[] = [
    {
      value: 'item-1',
      label: 'Raspberry Pi 4 Model B (4GB)',
      sku: 'EXP-RPI-4B',
      binLocation: 'Rack A - Shelf 2',
      category: 'Boards & Controllers',
      stockQty: 25,
      badge: '25 units'
    },
    {
      value: 'item-2',
      label: 'Arduino Mega 2560 R3',
      sku: 'EXP-ARD-MEGA',
      binLocation: 'Rack B - Shelf 1',
      category: 'Boards & Controllers',
      stockQty: 4,
      badge: '4 units'
    },
    {
      value: 'item-3',
      label: 'HC-SR04 Ultrasonic Distance Sensor',
      sku: 'EXP-SEN-ULTRA',
      binLocation: 'Rack A - Shelf 4',
      category: 'Sensors & Inputs',
      stockQty: 100,
      badge: '100 units'
    },
    {
      value: 'item-4',
      label: 'SG90 Micro Servo 9g',
      sku: 'EXP-ACT-SERVO',
      binLocation: 'Bin C-12',
      category: 'Outputs & Actuators',
      stockQty: 0,
      badge: '0 units'
    }
  ];

  it('returns all items when search query is empty or whitespace', () => {
    expect(filterComboboxOptions(mockOptions, '')).toHaveLength(4);
    expect(filterComboboxOptions(mockOptions, '   ')).toHaveLength(4);
  });

  it('filters items accurately by part name substring', () => {
    const result = filterComboboxOptions(mockOptions, 'Raspberry');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('item-1');
  });

  it('filters items by SKU code', () => {
    const result = filterComboboxOptions(mockOptions, 'EXP-SEN');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('item-3');
  });

  it('filters items by storage bin location', () => {
    const result = filterComboboxOptions(mockOptions, 'Bin C-12');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('item-4');
  });

  it('handles multi-term space-separated queries across multiple attributes', () => {
    // Matches "Arduino" (name) and "Rack B" (bin)
    const result = filterComboboxOptions(mockOptions, 'Arduino Rack B');
    expect(result).toHaveLength(1);
    expect(result[0].value).toBe('item-2');
  });

  it('is case-insensitive for all attributes', () => {
    const resultUpper = filterComboboxOptions(mockOptions, 'SERVO');
    const resultLower = filterComboboxOptions(mockOptions, 'servo');
    expect(resultUpper).toHaveLength(1);
    expect(resultLower).toHaveLength(1);
    expect(resultUpper[0].value).toBe('item-4');
  });

  it('returns empty array when no matches exist', () => {
    const result = filterComboboxOptions(mockOptions, 'NonexistentComponent999');
    expect(result).toHaveLength(0);
  });
});
