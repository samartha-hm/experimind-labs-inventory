import { describe, it, expect } from 'vitest';
import {
  normalizeElectronicValue,
  parseResistorOhms,
  parseCapacitanceFarads,
  parseInductanceHenries,
  calculateResistorBands,
  renderResistorSvg,
  getPackageGlyph
} from '../electronicAlias.ts';

describe('Electronic Parametric Alias Engine', () => {
  it('normalizes various resistor text representations to identical canonical ohm values', () => {
    const inputs = ['10k', '10K', '10kohm', '10000', '1002', '10K0', '10kΩ'];
    for (const inp of inputs) {
      const res = normalizeElectronicValue(inp, 'RESISTOR');
      expect(res.nominalValue).toBe(10000);
      expect(res.displayValue).toBe('10 kΩ');
      expect(res.aliasKey).toBe('RES_10000');
    }

    expect(parseResistorOhms('4k7')).toBe(4700);
    expect(parseResistorOhms('4.7k')).toBe(4700);
    expect(parseResistorOhms('472')).toBe(4700);
    expect(parseResistorOhms('100R')).toBe(100);
    expect(parseResistorOhms('1M')).toBe(1000000);
    expect(parseResistorOhms('2R2')).toBe(2.2);
  });

  it('normalizes various capacitor text representations including EIA 3-digit codes', () => {
    // 100nF, 0.1uF, 104, 100000pF all equal 100 nF = 1e-7 F
    const inputs = ['100nF', '0.1uF', '104', '100000pF'];
    for (const inp of inputs) {
      const cap = normalizeElectronicValue(inp, 'CAPACITOR');
      expect(cap.nominalValue).toBeCloseTo(1e-7, 9);
      expect(cap.displayValue).toBe('100 nF');
    }

    expect(parseCapacitanceFarads('10uF')).toBeCloseTo(1e-5, 8);
    expect(parseCapacitanceFarads('22pF')).toBeCloseTo(2.2e-11, 13);
    expect(parseCapacitanceFarads('4n7')).toBeCloseTo(4.7e-9, 11);
  });

  it('normalizes inductors accurately', () => {
    const ind = normalizeElectronicValue('10uH', 'INDUCTOR');
    expect(ind.nominalValue).toBeCloseTo(1e-5, 8);
    expect(ind.displayValue).toBe('10 µH');

    expect(parseInductanceHenries('1mH')).toBeCloseTo(1e-3, 5);
  });

  it('calculates 4-band and 5-band EIA resistor color codes correctly', () => {
    // 10k 5% 4-band: Brown (1), Black (0), Orange (x1k), Gold (5%)
    const bands4 = calculateResistorBands(10000, 5.0, 4);
    expect(bands4.length).toBe(4);
    expect(bands4[0].colorName).toBe('Brown');
    expect(bands4[1].colorName).toBe('Black');
    expect(bands4[2].colorName).toBe('Orange');
    expect(bands4[3].colorName).toBe('Gold');

    // 4.7k 1% 5-band: Yellow (4), Violet (7), Black (0), Brown (x10), Brown (1%)
    const bands5 = calculateResistorBands(4700, 1.0, 5);
    expect(bands5.length).toBe(5);
    expect(bands5[0].colorName).toBe('Yellow');
    expect(bands5[1].colorName).toBe('Violet');
    expect(bands5[2].colorName).toBe('Black');
    expect(bands5[3].colorName).toBe('Brown');
    expect(bands5[4].colorName).toBe('Brown');
  });

  it('generates valid SVG resistor graphic vectors', () => {
    const svg = renderResistorSvg(10000, 5.0, 4);
    expect(svg).toContain('<svg');
    expect(svg).toContain('viewBox="0 0 180 44"');
    expect(svg).toContain('fill="#ED8936"'); // Orange band
  });

  it('returns appropriate package glyph metadata for SMD and THT footprints', () => {
    const smd0402 = getPackageGlyph('0402');
    expect(smd0402.isSmt).toBe(true);
    expect(smd0402.code).toBe('0402');

    const sot23 = getPackageGlyph('SOT-23');
    expect(sot23.isSmt).toBe(true);
    expect(sot23.pinCount).toBe(3);

    const to220 = getPackageGlyph('TO-220');
    expect(to220.isSmt).toBe(false);

    const dip8 = getPackageGlyph('DIP-8');
    expect(dip8.isSmt).toBe(false);
    expect(dip8.pinCount).toBe(8);
  });
});
