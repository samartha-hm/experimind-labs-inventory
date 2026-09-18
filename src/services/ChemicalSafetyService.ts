export type SolutePhysicalState = 'SOLID' | 'LIQUID_STOCK';
export type GhsPictogram = 'CORROSIVE' | 'FLAMMABLE' | 'TOXIC' | 'HEALTH_HAZARD' | 'ENVIRONMENT' | 'IRRITANT' | 'OXIDIZING';

export interface SolutionPrepInput {
  chemicalName?: string;
  targetVolumeMl: number;
  targetMolarity: number;
  molecularWeight?: number;
  soluteType: SolutePhysicalState;
  stockMolarity?: number;
  hydrationFactor?: number;
}

export interface SolutionPrepOutput {
  chemicalName: string;
  targetVolumeMl: number;
  targetMolarity: number;
  requiredSoluteMassGrams?: number;
  requiredStockVolumeMl?: number;
  requiredSolventVolumeMl: number;
  containerRecommendation: string;
  tareVesselGrams: number;
  exothermicWarning: boolean;
  stepByStepSOP: string[];
}

export interface IncompatibilityIncident {
  chemicalA: string;
  chemicalB: string;
  hazardType: 'VIOLENT_EXOTHERM' | 'TOXIC_GAS_EVOLUTION' | 'FIRE_EXPLOSION' | 'PRECIPITATION';
  severity: 'HIGH' | 'CRITICAL';
  description: string;
  mitigationAdvice: string;
}

export interface GhsSafetyProfile {
  chemicalName: string;
  signalWord: 'DANGER' | 'WARNING' | 'NONE';
  pictograms: GhsPictogram[];
  hazardStatements: string[];
  precautionaryStatements: string[];
  requiredPPE: string[];
  storageClass: string;
}

const CHEMICAL_DATABASE: Record<string, Partial<GhsSafetyProfile & { mw: number; stockM: number }>> = {
  'Hydrochloric Acid': {
    mw: 36.46,
    stockM: 12.0,
    signalWord: 'DANGER',
    pictograms: ['CORROSIVE', 'IRRITANT'],
    hazardStatements: ['H314: Causes severe skin burns and eye damage', 'H335: May cause respiratory irritation'],
    precautionaryStatements: ['P280: Wear protective gloves/clothing/eye protection', 'P305+P351: Rinse cautiously with water'],
    requiredPPE: ['Chemical Splash Goggles', 'Heavy Duty Nitrile Gloves', 'Lab Coat', 'Acid Fume Hood'],
    storageClass: 'Inorganic Acid Cabinet (Separated from bases and flammables)'
  },
  'Sodium Hydroxide': {
    mw: 39.997,
    signalWord: 'DANGER',
    pictograms: ['CORROSIVE'],
    hazardStatements: ['H314: Causes severe skin burns and eye damage'],
    precautionaryStatements: ['P260: Do not breathe dust/fumes', 'P280: Wear protective gloves'],
    requiredPPE: ['Face Shield / Splash Goggles', 'Nitrile Gloves', 'Lab Coat'],
    storageClass: 'Inorganic Base Cabinet'
  },
  'Copper Sulfate': {
    mw: 249.68,
    signalWord: 'WARNING',
    pictograms: ['IRRITANT', 'ENVIRONMENT'],
    hazardStatements: ['H302: Harmful if swallowed', 'H410: Very toxic to aquatic life with long lasting effects'],
    precautionaryStatements: ['P273: Avoid release to the environment'],
    requiredPPE: ['Nitrile Gloves', 'Safety Glasses', 'Dust Mask'],
    storageClass: 'General Chemical Storage'
  },
  'Ethanol': {
    mw: 46.07,
    signalWord: 'DANGER',
    pictograms: ['FLAMMABLE'],
    hazardStatements: ['H225: Highly flammable liquid and vapour'],
    precautionaryStatements: ['P210: Keep away from heat, hot surfaces, sparks, open flames'],
    requiredPPE: ['Safety Glasses', 'Nitrile Gloves'],
    storageClass: 'Flammable Liquid Safety Cabinet'
  },
  'Potassium Permanganate': {
    mw: 158.034,
    signalWord: 'DANGER',
    pictograms: ['OXIDIZING', 'ENVIRONMENT', 'HEALTH_HAZARD'],
    hazardStatements: ['H272: May intensify fire; oxidizer', 'H302: Harmful if swallowed'],
    precautionaryStatements: ['P220: Keep/Store away from clothing/combustible materials'],
    requiredPPE: ['Nitrile Gloves', 'Splash Goggles', 'Fume Hood'],
    storageClass: 'Oxidizer Storage Locker'
  }
};

class ChemicalSafetyServiceClass {
  public calculateSolutionPreparation(input: SolutionPrepInput): SolutionPrepOutput {
    const chemName = input.chemicalName || 'Custom Solution';
    const mw = input.molecularWeight || CHEMICAL_DATABASE[chemName]?.mw || 100.0;
    const volLiters = input.targetVolumeMl / 1000.0;
    const targetM = input.targetMolarity;
    const hydration = input.hydrationFactor || 1.0;

    let soluteMass: number | undefined = undefined;
    let stockVol: number | undefined = undefined;
    let solventVol = input.targetVolumeMl;
    let isExothermic = false;

    if (input.soluteType === 'SOLID') {
      // m = M * V * MW * hydration
      soluteMass = Number((targetM * volLiters * mw * hydration).toFixed(4));
    } else {
      // Liquid stock C1V1 = C2V2 => V1 = (C2 * V2) / C1
      const stockM = input.stockMolarity || CHEMICAL_DATABASE[chemName]?.stockM || 10.0;
      if (stockM <= 0) {
        throw new Error('Stock molarity must be greater than 0');
      }
      stockVol = Number(((targetM * input.targetVolumeMl) / stockM).toFixed(4));
      solventVol = Number((input.targetVolumeMl - stockVol).toFixed(4));
      if (chemName.toLowerCase().includes('acid') || chemName.toLowerCase().includes('hydroxide')) {
        isExothermic = true;
      }
    }

    const sop: string[] = [];
    if (input.soluteType === 'SOLID') {
      sop.push(`1. Tare an analytical balance and weigh exactly ${soluteMass}g of analytical-grade ${chemName}.`);
      sop.push(`2. Add approx. ${Math.round(solventVol * 0.7)}mL of distilled/deionized water to a volumetric beaker.`);
      sop.push(`3. Transfer solute into the beaker with a magnetic stir bar until completely dissolved.`);
      sop.push(`4. Pour into a volumetric flask and add distilled water up to the ${input.targetVolumeMl}mL meniscus line.`);
      sop.push(`5. Invert 5-8 times to achieve homogeneous concentration.`);
    } else {
      sop.push(`1. Measure ${Math.round(solventVol)}mL of deionized water in a volumetric flask.`);
      sop.push(`2. IMPORTANT: Always add acid/base TO WATER. Pipette exactly ${stockVol}mL of stock ${chemName} slowly.`);
      sop.push(`3. Allow thermal dissipation if solution warms up due to heat of dilution.`);
      sop.push(`4. Top up to ${input.targetVolumeMl}mL calibration mark and label immediately.`);
    }

    let container = 'HDPE Laboratory Bottle (Leak-proof cap)';
    let tare = 42; // grams
    if (input.targetVolumeMl <= 100) {
      container = 'Amber Borosilicate Glass Dropper Vial (50-100mL)';
      tare = 28;
    } else if (input.targetVolumeMl >= 500) {
      container = 'HDPE Carboy with Dispensing Spigot (500-1000mL)';
      tare = 85;
    }

    return {
      chemicalName: chemName,
      targetVolumeMl: input.targetVolumeMl,
      targetMolarity: input.targetMolarity,
      requiredSoluteMassGrams: soluteMass,
      requiredStockVolumeMl: stockVol,
      requiredSolventVolumeMl: solventVol,
      containerRecommendation: container,
      tareVesselGrams: tare,
      exothermicWarning: isExothermic,
      stepByStepSOP: sop
    };
  }

  public checkChemicalCompatibility(chemicals: string[]): { isSafe: boolean; incompatibilities: IncompatibilityIncident[] } {
    const list = chemicals.map(c => c.toLowerCase());
    const incidents: IncompatibilityIncident[] = [];

    const hasAcid = list.some(c => c.includes('acid') || c.includes('hcl') || c.includes('sulfuric'));
    const hasBase = list.some(c => c.includes('hydroxide') || c.includes('naoh') || c.includes('koh'));
    const hasOxidizer = list.some(c => c.includes('permanganate') || c.includes('peroxide') || c.includes('nitrate'));
    const hasFlammableOrganic = list.some(c => c.includes('ethanol') || c.includes('acetone') || c.includes('alcohol') || c.includes('methanol'));

    if (hasAcid && hasBase) {
      incidents.push({
        chemicalA: 'Strong Acid',
        chemicalB: 'Strong Base',
        hazardType: 'VIOLENT_EXOTHERM',
        severity: 'HIGH',
        description: 'Direct mixing of concentrated acid and base releases intense heat that may shatter glassware or cause boiling splashes.',
        mitigationAdvice: 'Store in segregated acid/base compartments. Never aliquot simultaneously on the same secondary containment tray.'
      });
    }

    if (hasOxidizer && hasFlammableOrganic) {
      incidents.push({
        chemicalA: 'Strong Oxidizer (e.g. KMnO4)',
        chemicalB: 'Flammable Solvent (e.g. Ethanol)',
        hazardType: 'FIRE_EXPLOSION',
        severity: 'CRITICAL',
        description: 'Potassium permanganate / strong oxidizers react violently with alcohols and organic matter, creating spontaneous ignition hazards.',
        mitigationAdvice: 'Maintain a minimum 1.5 meter shelf segregation distance. Use dedicated glassware.'
      });
    }

    return {
      isSafe: incidents.length === 0,
      incompatibilities: incidents
    };
  }

  public getGhsSafetyData(chemicalName: string): GhsSafetyProfile {
    const matched = Object.keys(CHEMICAL_DATABASE).find(k => k.toLowerCase() === chemicalName.toLowerCase());
    const data = matched ? CHEMICAL_DATABASE[matched] : undefined;

    if (data) {
      return {
        chemicalName,
        signalWord: data.signalWord || 'WARNING',
        pictograms: data.pictograms || ['IRRITANT'],
        hazardStatements: data.hazardStatements || ['H302: Harmful if swallowed'],
        precautionaryStatements: data.precautionaryStatements || ['P280: Wear protective equipment'],
        requiredPPE: data.requiredPPE || ['Nitrile Gloves', 'Safety Glasses'],
        storageClass: data.storageClass || 'Standard Lab Chemical Storage'
      };
    }

    return {
      chemicalName,
      signalWord: 'WARNING',
      pictograms: ['IRRITANT'],
      hazardStatements: ['H302: Harmful if swallowed', 'H315: Causes skin irritation'],
      precautionaryStatements: ['P280: Wear protective gloves and eye protection'],
      requiredPPE: ['Laboratory Nitrile Gloves', 'Safety Splash Goggles'],
      storageClass: 'Standard Chemical Storage'
    };
  }
}

export const ChemicalSafetyService = new ChemicalSafetyServiceClass();
