/**
 * Electronic Parametric Alias Engine & Resistor Color Band Generator
 * Top 1% Engineering Execution for Experimind Labs
 * 
 * Normalizes electronic values (e.g. 10k, 10K, 10kohm, 10000, 1002 -> 10 kΩ)
 * Generates EIA 4-band and 5-band resistor color codes and SVG visuals
 * Provides footprint package glyph metadata for physical recognition
 */

export type ElectronicComponentType = 'RESISTOR' | 'CAPACITOR' | 'INDUCTOR';

export interface NormalizedElectronicSpec {
  raw: string;
  type: ElectronicComponentType;
  nominalValue: number; // in base units: Ohms, Farads, or Henries
  displayValue: string; // e.g. "10 kΩ", "100 nF", "10 µH"
  standardUnit: string; // "Ω", "F", "H"
  aliasKey: string;     // canonical key for exact matching: e.g. "RES_10000", "CAP_1e-7"
}

export interface ResistorBandColor {
  digit?: number;
  multiplier?: number;
  tolerance?: number;
  colorName: string;
  hex: string;
  role: 'DIGIT' | 'MULTIPLIER' | 'TOLERANCE';
}

export interface PackageGlyph {
  code: string;
  label: string;
  isSmt: boolean;
  pinCount?: number;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorder: string;
}

// EIA Color Standards
const EIA_DIGIT_COLORS: Record<number, { name: string; hex: string }> = {
  0: { name: 'Black', hex: '#1C1C1E' },
  1: { name: 'Brown', hex: '#8B4513' },
  2: { name: 'Red', hex: '#E53E3E' },
  3: { name: 'Orange', hex: '#ED8936' },
  4: { name: 'Yellow', hex: '#ECC94B' },
  5: { name: 'Green', hex: '#38A169' },
  6: { name: 'Blue', hex: '#3182CE' },
  7: { name: 'Violet', hex: '#805AD5' },
  8: { name: 'Gray', hex: '#718096' },
  9: { name: 'White', hex: '#F7FAFC' }
};

const EIA_MULTIPLIER_COLORS: Array<{ power: number; name: string; hex: string }> = [
  { power: -2, name: 'Silver', hex: '#CBD5E0' },
  { power: -1, name: 'Gold', hex: '#D69E2E' },
  { power: 0, name: 'Black', hex: '#1C1C1E' },
  { power: 1, name: 'Brown', hex: '#8B4513' },
  { power: 2, name: 'Red', hex: '#E53E3E' },
  { power: 3, name: 'Orange', hex: '#ED8936' },
  { power: 4, name: 'Yellow', hex: '#ECC94B' },
  { power: 5, name: 'Green', hex: '#38A169' },
  { power: 6, name: 'Blue', hex: '#3182CE' },
  { power: 7, name: 'Violet', hex: '#805AD5' },
  { power: 8, name: 'Gray', hex: '#718096' },
  { power: 9, name: 'White', hex: '#F7FAFC' }
];

const EIA_TOLERANCE_COLORS: Array<{ pct: number; name: string; hex: string }> = [
  { pct: 0.05, name: 'Gray', hex: '#718096' },
  { pct: 0.1, name: 'Violet', hex: '#805AD5' },
  { pct: 0.25, name: 'Blue', hex: '#3182CE' },
  { pct: 0.5, name: 'Green', hex: '#38A169' },
  { pct: 1.0, name: 'Brown', hex: '#8B4513' },
  { pct: 2.0, name: 'Red', hex: '#E53E3E' },
  { pct: 5.0, name: 'Gold', hex: '#D69E2E' },
  { pct: 10.0, name: 'Silver', hex: '#CBD5E0' }
];

/**
 * Normalizes user and vendor electronic text strings into canonical scientific units and alias keys.
 */
export function normalizeElectronicValue(
  input: string,
  type: ElectronicComponentType = 'RESISTOR'
): NormalizedElectronicSpec {
  if (!input || typeof input !== 'string') {
    return { raw: '', type, nominalValue: 0, displayValue: '0', standardUnit: '', aliasKey: 'UNKNOWN' };
  }

  const clean = input.trim().toLowerCase().replace(/[\s_]/g, '');

  if (type === 'RESISTOR') {
    const ohms = parseResistorOhms(clean);
    return {
      raw: input,
      type: 'RESISTOR',
      nominalValue: ohms,
      displayValue: formatResistance(ohms),
      standardUnit: 'Ω',
      aliasKey: `RES_${Math.round(ohms * 100) / 100}`
    };
  }

  if (type === 'CAPACITOR') {
    const farads = parseCapacitanceFarads(clean);
    return {
      raw: input,
      type: 'CAPACITOR',
      nominalValue: farads,
      displayValue: formatCapacitance(farads),
      standardUnit: 'F',
      aliasKey: `CAP_${farads.toExponential(4)}`
    };
  }

  const henries = parseInductanceHenries(clean);
  return {
    raw: input,
    type: 'INDUCTOR',
    nominalValue: henries,
    displayValue: formatInductance(henries),
    standardUnit: 'H',
    aliasKey: `IND_${henries.toExponential(4)}`
  };
}

/**
 * Parses resistor values supporting standard SI prefixes (m, R, k, M), 
 * inline multipliers (4k7, 2R2), 3-digit EIA codes (102 = 1k), and 4-digit EIA codes (1002 = 10k).
 */
export function parseResistorOhms(raw: string): number {
  let s = raw.replace(/(ohm|ohms|ω|r)/gi, 'R');

  // Inline R multiplier: 4R7 -> 4.7
  if (/^\d+R\d+$/i.test(s)) {
    const parts = s.split(/R/i);
    return parseFloat(`${parts[0]}.${parts[1]}`);
  }
  if (/^\d+R$/i.test(s)) {
    return parseFloat(s.replace(/R/i, ''));
  }

  // Inline k multiplier: 4k7 -> 4.7k -> 4700
  if (/^\d+k\d+$/i.test(s)) {
    const parts = s.split(/k/i);
    return parseFloat(`${parts[0]}.${parts[1]}`) * 1e3;
  }

  // Inline M multiplier: 1m5 -> 1.5M -> 1500000
  if (/^\d+m\d+$/i.test(s)) {
    const parts = s.split(/m/i);
    return parseFloat(`${parts[0]}.${parts[1]}`) * 1e6;
  }

  // 3-digit SMD code (e.g. 103 -> 10 * 10^3 = 10,000)
  if (/^\d{3}$/.test(s) && !s.includes('.')) {
    const sig = parseInt(s.slice(0, 2), 10);
    const exp = parseInt(s.slice(2, 3), 10);
    if (exp <= 8) {
      return sig * Math.pow(10, exp);
    }
  }

  // 4-digit SMD code (e.g. 1002 -> 100 * 10^2 = 10,000)
  if (/^\d{4}$/.test(s) && !s.includes('.')) {
    const sig = parseInt(s.slice(0, 3), 10);
    const exp = parseInt(s.slice(3, 4), 10);
    if (exp <= 7) {
      return sig * Math.pow(10, exp);
    }
  }

  // Standard numeric with suffix
  const match = s.match(/^([\d.]+)\s*(k|m|g)?/i);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'k') return num * 1e3;
    if (unit === 'm') return num * 1e6;
    if (unit === 'g') return num * 1e9;
    return num;
  }

  return parseFloat(s) || 0;
}

/**
 * Parses capacitance values supporting pF, nF, uF, µF, and 3-digit EIA codes (104 -> 100nF).
 */
export function parseCapacitanceFarads(raw: string): number {
  let s = raw.replace(/(farad|farads|f)/gi, '').trim();

  // 3-digit EIA code (e.g. 104 = 10 * 10^4 pF = 100,000 pF = 100 nF = 1e-7 F)
  if (/^\d{3}$/.test(s) && !s.includes('.')) {
    const sig = parseInt(s.slice(0, 2), 10);
    const exp = parseInt(s.slice(2, 3), 10);
    const pF = sig * Math.pow(10, exp);
    return pF * 1e-12;
  }

  // Inline units (e.g. 4n7 = 4.7 nF, 2u2 = 2.2 uF)
  if (/^\d+n\d+$/i.test(s)) {
    const p = s.split(/n/i);
    return parseFloat(`${p[0]}.${p[1]}`) * 1e-9;
  }
  if (/^\d+u\d+$/i.test(s) || /^\d+µ\d+$/i.test(s)) {
    const p = s.split(/[uµ]/i);
    return parseFloat(`${p[0]}.${p[1]}`) * 1e-6;
  }
  if (/^\d+p\d+$/i.test(s)) {
    const p = s.split(/p/i);
    return parseFloat(`${p[0]}.${p[1]}`) * 1e-12;
  }

  const match = s.match(/^([\d.]+)\s*(p|n|u|µ|m)?/i);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'p') return num * 1e-12;
    if (unit === 'n') return num * 1e-9;
    if (unit === 'u' || unit === 'µ') return num * 1e-6;
    if (unit === 'm') return num * 1e-3;
    if (num < 0.001) return num;
    if (num < 1) return num * 1e-6;
    return num * 1e-12;
  }

  return parseFloat(s) || 0;
}

/**
 * Parses inductance values supporting nH, uH, mH, and H.
 */
export function parseInductanceHenries(raw: string): number {
  let s = raw.replace(/(henry|henries|h)/gi, '').trim();

  if (/^\d+u\d+$/i.test(s) || /^\d+µ\d+$/i.test(s)) {
    const p = s.split(/[uµ]/i);
    return parseFloat(`${p[0]}.${p[1]}`) * 1e-6;
  }
  if (/^\d+m\d+$/i.test(s)) {
    const p = s.split(/m/i);
    return parseFloat(`${p[0]}.${p[1]}`) * 1e-3;
  }

  const match = s.match(/^([\d.]+)\s*(n|u|µ|m)?/i);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = (match[2] || '').toLowerCase();
    if (unit === 'n') return num * 1e-9;
    if (unit === 'u' || unit === 'µ') return num * 1e-6;
    if (unit === 'm') return num * 1e-3;
    return num;
  }
  return parseFloat(s) || 0;
}

export function formatResistance(ohms: number): string {
  if (ohms >= 1e6) {
    const val = Math.round((ohms / 1e6) * 100) / 100;
    return `${val} MΩ`;
  }
  if (ohms >= 1e3) {
    const val = Math.round((ohms / 1e3) * 100) / 100;
    return `${val} kΩ`;
  }
  return `${Math.round(ohms * 100) / 100} Ω`;
}

export function formatCapacitance(farads: number): string {
  if (farads >= 1e-3) {
    return `${Math.round(farads * 1e3 * 100) / 100} mF`;
  }
  if (farads >= 1e-6) {
    return `${Math.round(farads * 1e6 * 100) / 100} µF`;
  }
  if (farads >= 1e-9) {
    return `${Math.round(farads * 1e9 * 100) / 100} nF`;
  }
  return `${Math.round(farads * 1e12 * 100) / 100} pF`;
}

export function formatInductance(henries: number): string {
  if (henries >= 1) {
    return `${Math.round(henries * 100) / 100} H`;
  }
  if (henries >= 1e-3) {
    return `${Math.round(henries * 1e3 * 100) / 100} mH`;
  }
  if (henries >= 1e-6) {
    return `${Math.round(henries * 1e6 * 100) / 100} µH`;
  }
  return `${Math.round(henries * 1e9 * 100) / 100} nH`;
}

/**
 * Calculates EIA 4-band and 5-band color bands for a given resistance and tolerance.
 */
export function calculateResistorBands(
  ohms: number,
  tolerancePct: number = 5.0,
  bandCount: 4 | 5 = 4
): ResistorBandColor[] {
  if (ohms <= 0) return [];

  const bands: ResistorBandColor[] = [];
  const ohmsStr = ohms.toExponential();
  const [mantissaStr, exponentStr] = ohmsStr.split('e');
  const expVal = parseInt(exponentStr, 10);
  const mantissaNum = parseFloat(mantissaStr);

  if (bandCount === 4) {
    const rounded = Math.round(mantissaNum * 10) / 10;
    const digitsNum = Math.round(rounded * 10);
    const d1 = Math.floor(digitsNum / 10);
    const d2 = digitsNum % 10;
    const multiplierPower = expVal - 1;

    bands.push({
      digit: d1,
      colorName: EIA_DIGIT_COLORS[d1]?.name || 'Brown',
      hex: EIA_DIGIT_COLORS[d1]?.hex || '#8B4513',
      role: 'DIGIT'
    });
    bands.push({
      digit: d2,
      colorName: EIA_DIGIT_COLORS[d2]?.name || 'Black',
      hex: EIA_DIGIT_COLORS[d2]?.hex || '#1C1C1E',
      role: 'DIGIT'
    });

    const mult = EIA_MULTIPLIER_COLORS.find(m => m.power === multiplierPower) || {
      name: 'Black',
      hex: '#1C1C1E',
      power: 0
    };
    bands.push({
      multiplier: Math.pow(10, mult.power),
      colorName: mult.name,
      hex: mult.hex,
      role: 'MULTIPLIER'
    });
  } else {
    const rounded = Math.round(mantissaNum * 100) / 100;
    const digitsNum = Math.round(rounded * 100);
    const d1 = Math.floor(digitsNum / 100);
    const d2 = Math.floor((digitsNum % 100) / 10);
    const d3 = digitsNum % 10;
    const multiplierPower = expVal - 2;

    bands.push({
      digit: d1,
      colorName: EIA_DIGIT_COLORS[d1]?.name || 'Brown',
      hex: EIA_DIGIT_COLORS[d1]?.hex || '#8B4513',
      role: 'DIGIT'
    });
    bands.push({
      digit: d2,
      colorName: EIA_DIGIT_COLORS[d2]?.name || 'Black',
      hex: EIA_DIGIT_COLORS[d2]?.hex || '#1C1C1E',
      role: 'DIGIT'
    });
    bands.push({
      digit: d3,
      colorName: EIA_DIGIT_COLORS[d3]?.name || 'Black',
      hex: EIA_DIGIT_COLORS[d3]?.hex || '#1C1C1E',
      role: 'DIGIT'
    });

    const mult = EIA_MULTIPLIER_COLORS.find(m => m.power === multiplierPower) || {
      name: 'Black',
      hex: '#1C1C1E',
      power: 0
    };
    bands.push({
      multiplier: Math.pow(10, mult.power),
      colorName: mult.name,
      hex: mult.hex,
      role: 'MULTIPLIER'
    });
  }

  const tol = EIA_TOLERANCE_COLORS.find(t => t.pct === tolerancePct) || {
    pct: 5.0,
    name: 'Gold',
    hex: '#D69E2E'
  };
  bands.push({
    tolerance: tol.pct,
    colorName: tol.name,
    hex: tol.hex,
    role: 'TOLERANCE'
  });

  return bands;
}

/**
 * Generates an inline SVG vector diagram of the color-coded through-hole resistor.
 */
export function renderResistorSvg(
  ohms: number,
  tolerancePct: number = 5.0,
  bandCount: 4 | 5 = 4,
  width: number = 180,
  height: number = 44
): string {
  const bands = calculateResistorBands(ohms, tolerancePct, bandCount);
  if (!bands || bands.length === 0) return '';

  const bodyX = 35;
  const bodyY = 10;
  const bodyW = 110;
  const bodyH = 24;

  const bandPositions = bandCount === 4
    ? [bodyX + 20, bodyX + 38, bodyX + 56, bodyX + 90]
    : [bodyX + 16, bodyX + 32, bodyX + 48, bodyX + 64, bodyX + 92];

  const bandRects = bands
    .map((b, i) => {
      const x = bandPositions[i] || bodyX + 20 + i * 18;
      return `<rect x="${x}" y="${bodyY}" width="7" height="${bodyH}" fill="${b.hex}" rx="1" />`;
    })
    .join('');

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 180 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="5" y1="22" x2="35" y2="22" stroke="#A0AEC0" stroke-width="3" stroke-linecap="round"/>
      <line x1="145" y1="22" x2="175" y2="22" stroke="#A0AEC0" stroke-width="3" stroke-linecap="round"/>
      <rect x="${bodyX}" y="${bodyY}" width="${bodyW}" height="${bodyH}" rx="12" fill="#E2E8F0" stroke="#CBD5E0" stroke-width="1.5"/>
      <rect x="${bodyX + 4}" y="${bodyY + 2}" width="${bodyW - 8}" height="${bodyH - 4}" rx="8" fill="#EDF2F7"/>
      ${bandRects}
    </svg>
  `.trim();
}

/**
 * Returns package footprint glyph badges for electronic parts.
 */
export function getPackageGlyph(footprint: string): PackageGlyph {
  const f = (footprint || '').trim().toUpperCase();

  if (f.includes('0402')) {
    return { code: '0402', label: 'SMD 0402 (1005 Metric)', isSmt: true, badgeBg: '#FEF3C7', badgeTextColor: '#92400E', badgeBorder: '#FCD34D' };
  }
  if (f.includes('0603')) {
    return { code: '0603', label: 'SMD 0603 (1608 Metric)', isSmt: true, badgeBg: '#DBEAFE', badgeTextColor: '#1E40AF', badgeBorder: '#93C5FD' };
  }
  if (f.includes('0805')) {
    return { code: '0805', label: 'SMD 0805 (2012 Metric)', isSmt: true, badgeBg: '#D1FAE5', badgeTextColor: '#065F46', badgeBorder: '#6EE7B7' };
  }
  if (f.includes('1206')) {
    return { code: '1206', label: 'SMD 1206 (3216 Metric)', isSmt: true, badgeBg: '#E0E7FF', badgeTextColor: '#3730A3', badgeBorder: '#A5B4FC' };
  }
  if (f.includes('SOT-23') || f.includes('SOT23')) {
    return { code: 'SOT-23', label: 'SOT-23 Transistor', isSmt: true, pinCount: 3, badgeBg: '#F3E8FF', badgeTextColor: '#6B21A8', badgeBorder: '#D8B4FE' };
  }
  if (f.includes('SOIC-8') || f.includes('SO-8') || f.includes('SOIC8')) {
    return { code: 'SOIC-8', label: 'SOIC-8 Surface IC', isSmt: true, pinCount: 8, badgeBg: '#FCE7F3', badgeTextColor: '#9D174D', badgeBorder: '#FBCFE8' };
  }
  if (f.includes('LQFP-64') || f.includes('LQFP64')) {
    return { code: 'LQFP-64', label: 'LQFP-64 Microcontroller', isSmt: true, pinCount: 64, badgeBg: '#CCFBF1', badgeTextColor: '#115E59', badgeBorder: '#5EEAD4' };
  }
  if (f.includes('QFN-32') || f.includes('QFN32')) {
    return { code: 'QFN-32', label: 'QFN-32 Microcontroller', isSmt: true, pinCount: 32, badgeBg: '#FFEDD5', badgeTextColor: '#9A3412', badgeBorder: '#FDBA74' };
  }
  if (f.includes('TO-220') || f.includes('TO220')) {
    return { code: 'TO-220', label: 'TO-220 Power Reg/MOSFET', isSmt: false, pinCount: 3, badgeBg: '#FEE2E2', badgeTextColor: '#991B1B', badgeBorder: '#FCA5A5' };
  }
  if (f.includes('DIP-8') || f.includes('DIP8')) {
    return { code: 'DIP-8', label: 'DIP-8 Through-Hole IC', isSmt: false, pinCount: 8, badgeBg: '#E5E7EB', badgeTextColor: '#1F2937', badgeBorder: '#D1D5DB' };
  }
  if (f.includes('DIP-14') || f.includes('DIP-16')) {
    return { code: 'DIP-14/16', label: 'DIP Logic IC', isSmt: false, badgeBg: '#E5E7EB', badgeTextColor: '#1F2937', badgeBorder: '#D1D5DB' };
  }

  const isSmt = !f.includes('DIP') && !f.includes('TH') && !f.includes('RADIAL') && !f.includes('AXIAL');
  return {
    code: f || 'CUSTOM',
    label: f ? `${f} (${isSmt ? 'SMD' : 'THT'})` : 'Standard Package',
    isSmt,
    badgeBg: '#F3F4F6',
    badgeTextColor: '#374151',
    badgeBorder: '#E5E7EB'
  };
}
