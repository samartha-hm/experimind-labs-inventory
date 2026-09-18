import { describe, it, expect } from 'vitest';
import { LaserNestingService, LaserMaterialProfile } from '../LaserNestingService';

describe('LaserNestingService', () => {
  it('calculates optimal sheet nesting and yield for batch production items', () => {
    const nesting = LaserNestingService.calculateNesting({
      sheetWidthMm: 600,
      sheetHeightMm: 400,
      material: 'CAST_ACRYLIC_3MM',
      kerfMm: 0.15,
      spacingMm: 3.0,
      batchMultiplier: 10
    });

    expect(nesting.totalParts).toBeGreaterThan(0);
    expect(nesting.sheetsRequired).toBeGreaterThanOrEqual(1);
    expect(nesting.sheetYieldPercentage).toBeGreaterThan(10);
    expect(nesting.sheetYieldPercentage).toBeLessThanOrEqual(100);
    expect(nesting.scrapPercentage).toBe(100 - nesting.sheetYieldPercentage);
    expect(nesting.estimatedLaserRunTimeMinutes).toBeGreaterThan(0);
    expect(nesting.totalCostINR).toBeGreaterThan(0);
  });

  it('adjusts laser speed, power, and cost based on selected material profile', () => {
    const acrylic = LaserNestingService.getMaterialProfile('CAST_ACRYLIC_3MM');
    const mdf = LaserNestingService.getMaterialProfile('MDF_4MM');

    expect(acrylic).toBeDefined();
    expect(mdf).toBeDefined();
    expect(acrylic.costPerSheetINR).toBeGreaterThan(mdf.costPerSheetINR);
    expect(acrylic.laserSpeedMmPerSec).toBeDefined();
    expect(acrylic.laserPowerPercentage).toBeDefined();
  });

  it('generates SVG layout representation with positioned parts', () => {
    const layout = LaserNestingService.generateSvgLayout({
      sheetWidthMm: 600,
      sheetHeightMm: 400,
      material: 'CAST_ACRYLIC_3MM',
      kerfMm: 0.15,
      spacingMm: 3.0,
      batchMultiplier: 5
    });

    expect(layout.sheets.length).toBeGreaterThanOrEqual(1);
    expect(layout.sheets[0].placedParts.length).toBeGreaterThan(0);
    expect(layout.sheets[0].placedParts[0].x).toBeGreaterThanOrEqual(0);
    expect(layout.sheets[0].placedParts[0].y).toBeGreaterThanOrEqual(0);
  });
});
