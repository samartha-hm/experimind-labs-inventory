import {
  MASTER_PRODUCTION_ITEMS,
  MASTER_PRODUCTION_DOUBTS,
  ProductionItem,
  ProductionDoubt,
  ItemStatus,
  SourcingType,
  PouchCategory,
  CrateLevel,
  BranchOrigin
} from '../data/productionDataset';

export interface BatchCalculationResult {
  batchMultiplier: number;
  totalUniqueComponents: number;
  totalUnitsRequired: number;
  totalEstimatedCost: number;
  overallPreppedPercent: number;
  overallPackedPercent: number;
  
  sourcingBreakdown: {
    inStockCount: number;
    toOrderCount: number;
    inHousePrepCount: number;
    laserCutCount: number;
    crateSharedCount: number;
  };
  
  shortageList: Array<{
    item: ProductionItem;
    requiredQty: number;
    availableStock: number;
    deficit: number;
    estimatedShortageCost: number;
  }>;
  
  chemicalPrepQueue: Array<{
    materialName: string;
    totalVolumeMl: number;
    hazardLevel: string;
    containerType: string;
    bottlesToFill: number;
    activityCode: string;
  }>;
  
  laserCuttingQueue: Array<{
    materialName: string;
    materialType: string;
    unitsToCut: number;
    totalCutMinutes: number;
    estimatedSheetsNeeded: number;
    activityCode: string;
    kerfOffset: string;
  }>;
  
  branchDispatches: Array<{
    branch: BranchOrigin;
    itemCount: number;
    items: Array<{ materialName: string; activityCode: string; requiredQty: number; qaNotes: string }>;
  }>;
}

export class ProductionWorkflowService {
  private static items: ProductionItem[] = [...MASTER_PRODUCTION_ITEMS];
  private static doubts: ProductionDoubt[] = [...MASTER_PRODUCTION_DOUBTS];

  public static getItems(filters?: {
    grade?: string;
    sourcingType?: SourcingType | 'ALL';
    status?: ItemStatus | 'ALL';
    branch?: BranchOrigin | 'ALL';
    crateLevel?: CrateLevel | 'ALL';
    search?: string;
  }): ProductionItem[] {
    let result = [...this.items];

    if (filters) {
      if (filters.grade && filters.grade !== 'ALL') {
        result = result.filter(i => i.grade.toLowerCase() === filters.grade!.toLowerCase());
      }
      if (filters.sourcingType && filters.sourcingType !== 'ALL') {
        result = result.filter(i => i.sourcingType === filters.sourcingType);
      }
      if (filters.status && filters.status !== 'ALL') {
        result = result.filter(i => i.status === filters.status);
      }
      if (filters.branch && filters.branch !== 'ALL') {
        result = result.filter(i => i.branchOrigin === filters.branch);
      }
      if (filters.crateLevel && filters.crateLevel !== 'ALL') {
        result = result.filter(i => i.crateLevel === filters.crateLevel);
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        result = result.filter(i =>
          i.materialName.toLowerCase().includes(q) ||
          i.activityCode.toLowerCase().includes(q) ||
          i.activityName.toLowerCase().includes(q) ||
          i.prepSpecification.toLowerCase().includes(q) ||
          i.warehouseBin.toLowerCase().includes(q)
        );
      }
    }

    return result;
  }

  public static calculateBatchRequirements(batchMultiplier: number = 1, gradeFilter?: string): BatchCalculationResult {
    const mult = Math.max(1, Math.floor(batchMultiplier));
    let targetItems = this.getItems(gradeFilter && gradeFilter !== 'ALL' ? { grade: gradeFilter } : undefined);

    let totalUnits = 0;
    let totalCost = 0;
    let preppedTotal = 0;
    let packedTotal = 0;

    let inStock = 0;
    let toOrder = 0;
    let inHouse = 0;
    let laser = 0;
    let crateShared = 0;

    const shortages: BatchCalculationResult['shortageList'] = [];
    const chemMap = new Map<string, { totalMl: number; hazard: string; container: string; bottles: number; activity: string }>();
    const laserMap = new Map<string, { material: string; units: number; minutes: number; activity: string; kerf: string }>();
    const branchMap = new Map<BranchOrigin, Array<{ materialName: string; activityCode: string; requiredQty: number; qaNotes: string }>>();

    for (const item of targetItems) {
      const required = item.quantityPerKit * mult;
      totalUnits += required;
      totalCost += item.unitCost * required;
      
      if (item.status === 'PREPPED' || item.status === 'BAGGED' || item.status === 'PACKED') {
        preppedTotal += required;
      }
      if (item.status === 'PACKED') {
        packedTotal += required;
      }

      // Sourcing stream
      switch (item.sourcingType) {
        case 'IN_STOCK': inStock++; break;
        case 'TO_ORDER': toOrder++; break;
        case 'IN_HOUSE_PREP': inHouse++; break;
        case 'LASER_CUT_FABLAB': laser++; break;
        case 'CRATE_SHARED': crateShared++; break;
      }

      // Shortages
      if (required > item.currentStock) {
        const deficit = required - item.currentStock;
        shortages.push({
          item,
          requiredQty: required,
          availableStock: item.currentStock,
          deficit,
          estimatedShortageCost: deficit * item.unitCost
        });
      }

      // Chemical Queue
      if (item.chemicalSpecs) {
        const existing = chemMap.get(item.materialName) || {
          totalMl: 0,
          hazard: item.chemicalSpecs.hazardLevel,
          container: item.chemicalSpecs.containerType,
          bottles: 0,
          activity: item.activityCode
        };
        existing.totalMl += (item.chemicalSpecs.volumeMl * mult);
        existing.bottles += (1 * mult);
        chemMap.set(item.materialName, existing);
      }

      // Laser Cut Queue
      if (item.laserSpecs) {
        const existing = laserMap.get(item.materialName) || {
          material: item.laserSpecs.material,
          units: 0,
          minutes: 0,
          activity: item.activityCode,
          kerf: item.laserSpecs.kerfOffset
        };
        existing.units += (1 * mult);
        existing.minutes += (item.laserSpecs.cutTimeMinutes * mult);
        laserMap.set(item.materialName, existing);
      }

      // Branch Dispatches
      const bList = branchMap.get(item.branchOrigin) || [];
      bList.push({
        materialName: item.materialName,
        activityCode: item.activityCode,
        requiredQty: required,
        qaNotes: item.qaNotes || ''
      });
      branchMap.set(item.branchOrigin, bList);
    }

    const chemicalPrepQueue: BatchCalculationResult['chemicalPrepQueue'] = Array.from(chemMap.entries()).map(([name, data]) => ({
      materialName: name,
      totalVolumeMl: data.totalMl,
      hazardLevel: data.hazard,
      containerType: data.container,
      bottlesToFill: data.bottles,
      activityCode: data.activity
    }));

    const laserCuttingQueue: BatchCalculationResult['laserCuttingQueue'] = Array.from(laserMap.entries()).map(([name, data]) => ({
      materialName: name,
      materialType: data.material,
      unitsToCut: data.units,
      totalCutMinutes: Number(data.minutes.toFixed(1)),
      estimatedSheetsNeeded: Math.ceil(data.units / 8), // Standard 8 parts per 600x400mm MDF sheet
      activityCode: data.activity,
      kerfOffset: data.kerf
    }));

    const branchDispatches: BatchCalculationResult['branchDispatches'] = Array.from(branchMap.entries()).map(([branch, items]) => ({
      branch,
      itemCount: items.length,
      items
    }));

    return {
      batchMultiplier: mult,
      totalUniqueComponents: targetItems.length,
      totalUnitsRequired: totalUnits,
      totalEstimatedCost: Math.round(totalCost),
      overallPreppedPercent: totalUnits > 0 ? Number(((preppedTotal / totalUnits) * 100).toFixed(1)) : 0,
      overallPackedPercent: totalUnits > 0 ? Number(((packedTotal / totalUnits) * 100).toFixed(1)) : 0,
      sourcingBreakdown: {
        inStockCount: inStock,
        toOrderCount: toOrder,
        inHousePrepCount: inHouse,
        laserCutCount: laser,
        crateSharedCount: crateShared
      },
      shortageList: shortages,
      chemicalPrepQueue,
      laserCuttingQueue,
      branchDispatches
    };
  }

  public static updateItemStatus(
    itemId: string,
    status: ItemStatus,
    updates?: {
      preppedCount?: number;
      packedCount?: number;
      qaNotes?: string;
      currentStock?: number;
    }
  ): ProductionItem | null {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return null;

    item.status = status;
    if (updates) {
      if (updates.preppedCount !== undefined) item.preppedCount = updates.preppedCount;
      if (updates.packedCount !== undefined) item.packedCount = updates.packedCount;
      if (updates.qaNotes !== undefined) item.qaNotes = updates.qaNotes;
      if (updates.currentStock !== undefined) item.currentStock = updates.currentStock;
    }
    return item;
  }

  public static batchUpdateStatus(itemIds: string[], status: ItemStatus): number {
    let count = 0;
    for (const id of itemIds) {
      const it = this.items.find(i => i.id === id);
      if (it) {
        it.status = status;
        if (status === 'PREPPED') it.preppedCount = it.quantityPerKit;
        if (status === 'PACKED') it.packedCount = it.quantityPerKit;
        count++;
      }
    }
    return count;
  }

  public static addCustomItem(data: Partial<ProductionItem>): ProductionItem {
    const newId = `PRD-${(this.items.length + 1).toString().padStart(4, '0')}`;
    const newItem: ProductionItem = {
      id: newId,
      grade: data.grade || 'Grade 8',
      chapter: data.chapter || 'Custom Chapter',
      activityCode: data.activityCode || 'CUST.1',
      activityName: data.activityName || 'Custom Experiment',
      materialName: data.materialName || 'Custom Component',
      prepSpecification: data.prepSpecification || '1 unit',
      quantityPerKit: data.quantityPerKit || 1,
      unit: data.unit || 'pcs',
      sourcingType: data.sourcingType || 'IN_STOCK',
      pouchCategory: data.pouchCategory || 'HARDWARE_BLUE',
      crateLevel: data.crateLevel || 'ACTIVITY_POUCH',
      branchOrigin: data.branchOrigin || 'KARWAR_MAIN',
      unitCost: data.unitCost || 20,
      warehouseBin: data.warehouseBin || 'Rack 1, Shelf A',
      currentStock: data.currentStock || 10,
      preppedCount: 0,
      packedCount: 0,
      status: 'PENDING',
      laserSpecs: data.laserSpecs || null,
      chemicalSpecs: data.chemicalSpecs || null,
      qaNotes: data.qaNotes || 'Custom component added by user'
    };
    this.items.unshift(newItem);
    return newItem;
  }

  public static getDoubts(): ProductionDoubt[] {
    return this.doubts;
  }

  public static addDoubt(doubt: Omit<ProductionDoubt, 'id'>): ProductionDoubt {
    const newDoubt: ProductionDoubt = {
      id: `DBT-${(this.doubts.length + 1).toString().padStart(3, '0')}`,
      ...doubt
    };
    this.doubts.unshift(newDoubt);
    return newDoubt;
  }

  public static updateDoubt(id: string, updates: Partial<ProductionDoubt>): ProductionDoubt | null {
    const d = this.doubts.find(x => x.id === id);
    if (!d) return null;
    Object.assign(d, updates);
    return d;
  }
}
