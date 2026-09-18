import { describe, it, expect } from 'vitest';
import { ChemicalSafetyService } from '../ChemicalSafetyService';

describe('ChemicalSafetyService', () => {
  it('calculates accurate solid mass for molar solution prep', () => {
    // 0.1 M Copper Sulfate Pentahydrate (CuSO4.5H2O, MW = 249.68 g/mol) in 500 mL
    const result = ChemicalSafetyService.calculateSolutionPreparation({
      targetVolumeMl: 500,
      targetMolarity: 0.1,
      molecularWeight: 249.68,
      soluteType: 'SOLID'
    });

    expect(result.requiredSoluteMassGrams).toBeCloseTo(12.484, 2);
    expect(result.requiredSolventVolumeMl).toBe(500);
    expect(result.containerRecommendation).toBeDefined();
    expect(result.stepByStepSOP.length).toBeGreaterThan(2);
  });

  it('calculates liquid stock dilution via C1V1 = C2V2', () => {
    // Dilute 12M stock HCl to 0.1M HCl in 250 mL
    const result = ChemicalSafetyService.calculateSolutionPreparation({
      chemicalName: 'Hydrochloric Acid',
      targetVolumeMl: 250,
      targetMolarity: 0.1,
      stockMolarity: 12.0,
      soluteType: 'LIQUID_STOCK'
    });

    expect(result.requiredStockVolumeMl).toBeCloseTo(2.083, 2);
    expect(result.requiredSolventVolumeMl).toBeCloseTo(247.917, 2);
    expect(result.exothermicWarning).toBe(true);
  });

  it('flags chemical incompatibilities in multi-item kits', () => {
    const safeCheck = ChemicalSafetyService.checkChemicalCompatibility([
      'Sodium Chloride',
      'Distilled Water',
      'Sucrose'
    ]);
    expect(safeCheck.isSafe).toBe(true);
    expect(safeCheck.incompatibilities.length).toBe(0);

    const hazardCheck = ChemicalSafetyService.checkChemicalCompatibility([
      'Hydrochloric Acid',
      'Sodium Hydroxide',
      'Ethanol',
      'Potassium Permanganate'
    ]);
    expect(hazardCheck.isSafe).toBe(false);
    expect(hazardCheck.incompatibilities.length).toBeGreaterThanOrEqual(1);
  });

  it('returns GHS hazard badges and PPE protocol', () => {
    const ghs = ChemicalSafetyService.getGhsSafetyData('Hydrochloric Acid');
    expect(ghs.signalWord).toBe('DANGER');
    expect(ghs.pictograms).toContain('CORROSIVE');
    expect(ghs.requiredPPE.some(p => p.toLowerCase().includes('glove'))).toBe(true);
  });
});
