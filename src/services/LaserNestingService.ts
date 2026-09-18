import { MASTER_PRODUCTION_ITEMS, ProductionItem } from '../data/productionDataset';

export type LaserMaterialType = 'CAST_ACRYLIC_3MM' | 'CLEAR_ACRYLIC_5MM' | 'MDF_4MM' | 'BIRCH_PLY_3MM' | 'BALSA_2MM' | 'DELRIN_1MM';

export interface LaserMaterialProfile {
  id: LaserMaterialType;
  name: string;
  category: 'PLASTIC' | 'WOOD' | 'ENGINEERING';
  thicknessMm: number;
  costPerSheetINR: number;
  standardSheetDimensionsMm: { width: number; height: number };
  laserSpeedMmPerSec: number;
  laserPowerPercentage: number;
  frequencyHz: number;
  recommendedKerfMm: number;
}

export interface NestingPart {
  id: string;
  name: string;
  grade: string;
  widthMm: number;
  heightMm: number;
  quantity: number;
  colorHex: string;
}

export interface PlacedPart {
  partId: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  colorHex: string;
  sheetIndex: number;
}

export interface NestingSheet {
  sheetIndex: number;
  widthMm: number;
  heightMm: number;
  placedParts: PlacedPart[];
  usedAreaMm2: number;
  sheetAreaMm2: number;
  yieldPercentage: number;
}

export interface NestingCalculationResult {
  sheetWidthMm: number;
  sheetHeightMm: number;
  material: LaserMaterialType;
  materialProfile: LaserMaterialProfile;
  totalParts: number;
  sheetsRequired: number;
  sheetYieldPercentage: number;
  scrapPercentage: number;
  totalSheetAreaMm2: number;
  usedAreaMm2: number;
  estimatedLaserRunTimeMinutes: number;
  materialCostINR: number;
  machineTimeCostINR: number;
  totalCostINR: number;
  placedSheets: NestingSheet[];
}

export interface NestingOptions {
  sheetWidthMm?: number;
  sheetHeightMm?: number;
  material?: LaserMaterialType;
  kerfMm?: number;
  spacingMm?: number;
  batchMultiplier?: number;
}

export const LASER_MATERIAL_PROFILES: Record<LaserMaterialType, LaserMaterialProfile> = {
  CAST_ACRYLIC_3MM: {
    id: 'CAST_ACRYLIC_3MM',
    name: 'Cast Acrylic 3.0mm (Optical Clear / Smoke)',
    category: 'PLASTIC',
    thicknessMm: 3.0,
    costPerSheetINR: 680,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 18,
    laserPowerPercentage: 75,
    frequencyHz: 5000,
    recommendedKerfMm: 0.15
  },
  CLEAR_ACRYLIC_5MM: {
    id: 'CLEAR_ACRYLIC_5MM',
    name: 'Cast Acrylic 5.0mm (Heavy Duty Optical)',
    category: 'PLASTIC',
    thicknessMm: 5.0,
    costPerSheetINR: 1120,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 10,
    laserPowerPercentage: 90,
    frequencyHz: 5000,
    recommendedKerfMm: 0.22
  },
  MDF_4MM: {
    id: 'MDF_4MM',
    name: 'High-Density MDF 4.0mm (Structural Chassis)',
    category: 'WOOD',
    thicknessMm: 4.0,
    costPerSheetINR: 240,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 22,
    laserPowerPercentage: 80,
    frequencyHz: 2000,
    recommendedKerfMm: 0.18
  },
  BIRCH_PLY_3MM: {
    id: 'BIRCH_PLY_3MM',
    name: 'Aviation Grade Birch Plywood 3.0mm',
    category: 'WOOD',
    thicknessMm: 3.0,
    costPerSheetINR: 420,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 20,
    laserPowerPercentage: 80,
    frequencyHz: 2500,
    recommendedKerfMm: 0.16
  },
  BALSA_2MM: {
    id: 'BALSA_2MM',
    name: 'Ultra-Light Balsa Wood 2.0mm (Aero Wings)',
    category: 'WOOD',
    thicknessMm: 2.0,
    costPerSheetINR: 190,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 35,
    laserPowerPercentage: 45,
    frequencyHz: 1500,
    recommendedKerfMm: 0.12
  },
  DELRIN_1MM: {
    id: 'DELRIN_1MM',
    name: 'Acetal / Delrin 1.0mm (Low-Friction Gears)',
    category: 'ENGINEERING',
    thicknessMm: 1.0,
    costPerSheetINR: 850,
    standardSheetDimensionsMm: { width: 600, height: 400 },
    laserSpeedMmPerSec: 24,
    laserPowerPercentage: 70,
    frequencyHz: 8000,
    recommendedKerfMm: 0.14
  }
};

class LaserNestingServiceClass {
  public getMaterialProfile(material: LaserMaterialType): LaserMaterialProfile {
    return LASER_MATERIAL_PROFILES[material] || LASER_MATERIAL_PROFILES.CAST_ACRYLIC_3MM;
  }

  public getLaserProductionParts(batchMultiplier: number = 1): NestingPart[] {
    const laserItems = MASTER_PRODUCTION_ITEMS.filter(i => i.sourcingType === 'LASER_CUT_FABLAB');
    const colorPalette = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6366F1'];

    return laserItems.map((item, idx) => {
      // Estimate dimensions from item prep specification or default bounding boxes
      let w = 80;
      let h = 50;
      const lower = item.prepSpecification.toLowerCase();
      if (lower.includes('gear')) { w = 60; h = 60; }
      else if (lower.includes('slit') || lower.includes('grating')) { w = 50; h = 30; }
      else if (lower.includes('bracket') || lower.includes('stand')) { w = 110; h = 70; }
      else if (lower.includes('chassis') || lower.includes('base')) { w = 140; h = 90; }

      return {
        id: item.id,
        name: item.materialName,
        grade: item.grade,
        widthMm: w,
        heightMm: h,
        quantity: item.quantityPerKit * Math.max(1, batchMultiplier),
        colorHex: colorPalette[idx % colorPalette.length]
      };
    });
  }

  public calculateNesting(options: NestingOptions = {}): NestingCalculationResult {
    const materialKey = options.material || 'CAST_ACRYLIC_3MM';
    const profile = this.getMaterialProfile(materialKey);
    const sheetW = options.sheetWidthMm || profile.standardSheetDimensionsMm.width;
    const sheetH = options.sheetHeightMm || profile.standardSheetDimensionsMm.height;
    const kerf = options.kerfMm !== undefined ? options.kerfMm : profile.recommendedKerfMm;
    const spacing = options.spacingMm !== undefined ? options.spacingMm : 3.0;
    const batchMultiplier = options.batchMultiplier || 1;

    const parts = this.getLaserProductionParts(batchMultiplier);
    const totalPartCount = parts.reduce((sum, p) => sum + p.quantity, 0);

    // Bin packing simulation (Shelf first-fit decreasing with kerf and spacing)
    const sheets: NestingSheet[] = [];
    let currentSheetIndex = 0;
    let curX = spacing;
    let curY = spacing;
    let shelfHeight = 0;

    const createNewSheet = (idx: number): NestingSheet => ({
      sheetIndex: idx,
      widthMm: sheetW,
      heightMm: sheetH,
      placedParts: [],
      usedAreaMm2: 0,
      sheetAreaMm2: sheetW * sheetH,
      yieldPercentage: 0
    });

    let activeSheet = createNewSheet(currentSheetIndex);
    sheets.push(activeSheet);

    parts.forEach(part => {
      const partEffectiveW = part.widthMm + kerf + spacing;
      const partEffectiveH = part.heightMm + kerf + spacing;

      for (let q = 0; q < part.quantity; q++) {
        // Check if fits on current shelf
        if (curX + partEffectiveW > sheetW - spacing) {
          // Next shelf
          curX = spacing;
          curY += shelfHeight + spacing;
          shelfHeight = 0;
        }

        // Check if fits on current sheet
        if (curY + partEffectiveH > sheetH - spacing) {
          // Next sheet
          currentSheetIndex++;
          activeSheet = createNewSheet(currentSheetIndex);
          sheets.push(activeSheet);
          curX = spacing;
          curY = spacing;
          shelfHeight = 0;
        }

        // Place part
        activeSheet.placedParts.push({
          partId: part.id,
          name: part.name,
          x: curX,
          y: curY,
          width: part.widthMm,
          height: part.heightMm,
          colorHex: part.colorHex,
          sheetIndex: currentSheetIndex
        });

        activeSheet.usedAreaMm2 += (part.widthMm * part.heightMm);
        curX += partEffectiveW;
        if (partEffectiveH > shelfHeight) {
          shelfHeight = partEffectiveH;
        }
      }
    });

    // Calculate metrics per sheet and enterprise total
    let totalUsedArea = 0;
    sheets.forEach(s => {
      s.yieldPercentage = Math.min(100, Math.round((s.usedAreaMm2 / s.sheetAreaMm2) * 100));
      totalUsedArea += s.usedAreaMm2;
    });

    const totalSheetArea = sheets.length * sheetW * sheetH;
    const overallYield = totalSheetArea > 0 ? Math.min(100, Math.round((totalUsedArea / totalSheetArea) * 100)) : 0;
    const scrapPct = 100 - overallYield;

    // Laser cut runtime approximation (perimeter / speed)
    let totalPerimeterMm = 0;
    parts.forEach(p => {
      totalPerimeterMm += 2 * (p.widthMm + p.heightMm) * p.quantity;
    });
    const runTimeSeconds = totalPerimeterMm / profile.laserSpeedMmPerSec;
    const runTimeMinutes = Math.round(runTimeSeconds / 60) + (sheets.length * 2); // 2 min sheet load overhead

    const materialCost = sheets.length * profile.costPerSheetINR;
    const machineHourlyRateINR = 450; // INR 450/hour for 80W CO2 laser
    const machineCost = Math.round((runTimeMinutes / 60) * machineHourlyRateINR);

    return {
      sheetWidthMm: sheetW,
      sheetHeightMm: sheetH,
      material: materialKey,
      materialProfile: profile,
      totalParts: totalPartCount,
      sheetsRequired: sheets.length,
      sheetYieldPercentage: overallYield,
      scrapPercentage: scrapPct,
      totalSheetAreaMm2: totalSheetArea,
      usedAreaMm2: totalUsedArea,
      estimatedLaserRunTimeMinutes: runTimeMinutes,
      materialCostINR: materialCost,
      machineTimeCostINR: machineCost,
      totalCostINR: materialCost + machineCost,
      placedSheets: sheets
    };
  }

  public generateSvgLayout(options: NestingOptions = {}): { sheets: NestingSheet[]; svgSnippets: string[] } {
    const result = this.calculateNesting(options);
    const svgSnippets = result.placedSheets.map(sheet => {
      const partsSvg = sheet.placedParts
        .map(
          p => `<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="2" fill="${p.colorHex}" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="0.5"><title>${p.name} (${p.width}x${p.height}mm)</title></rect>`
        )
        .join('');

      return `<svg viewBox="0 0 ${sheet.widthMm} ${sheet.heightMm}" class="w-full h-auto bg-slate-900 border border-slate-700 rounded-lg">${partsSvg}</svg>`;
    });

    return { sheets: result.placedSheets, svgSnippets };
  }
}

export const LaserNestingService = new LaserNestingServiceClass();
