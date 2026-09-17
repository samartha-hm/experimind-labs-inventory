import { AppDataSource } from "../db.ts";
import { BomNode } from "../entity/BomNode.ts";
import { ComponentAlternate } from "../entity/ComponentAlternate.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { StockLot } from "../entity/StockLot.ts";

export interface TreeNode {
  id: string;
  bomNodeId?: string;
  itemId: string;
  sku: string;
  name: string;
  mpn?: string;
  packageFootprint?: string;
  mountingType?: string;
  mslRating?: string;
  unitCost: number;
  quantityPerAssembly: number;
  scrapPercentage: number;
  effectiveQuantity: number;
  referenceDesignators: string[];
  assemblyPhase: string;
  doNotPopulate: boolean;
  notes?: string;
  level: number;
  path: string[];
  currentStock: number;
  stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  extendedCost: number;
  alternates: Array<{
    id: string;
    alternateItemId: string;
    sku: string;
    name: string;
    mpn?: string;
    currentStock: number;
    preferenceRank: number;
    approvalStatus: string;
  }>;
  children: TreeNode[];
}

export interface ShortageItem {
  itemId: string;
  sku: string;
  name: string;
  mpn?: string;
  requiredQuantity: number;
  currentStock: number;
  missingQuantity: number;
  canFulfillWithAlternates: boolean;
  suggestedAlternate?: {
    id: string;
    name: string;
    currentStock: number;
  };
}

export interface ShortageAnalysisResult {
  parentItemId: string;
  buildQuantity: number;
  hasShortage: boolean;
  totalComponentsRequired: number;
  criticalShortageCount: number;
  shortages: ShortageItem[];
}

export class BomService {
  private static bomRepo = AppDataSource.getRepository(BomNode);
  private static altRepo = AppDataSource.getRepository(ComponentAlternate);
  private static itemRepo = AppDataSource.getRepository(InventoryItem);
  private static lotRepo = AppDataSource.getRepository(StockLot);

  // ==========================================
  // Mathematical & Standard Algorithmic Helpers
  // ==========================================

  /**
   * Calculate effective demand factoring in scrap percentage for SMT feeder / assembly loss
   */
  public static calculateEffectiveQuantity(
    quantity: number,
    scrapPercentage: number = 0,
    packageFootprint?: string
  ): number {
    // Standard +3% attrition allowance for SMD passives (0402, 0603, 0805, 1206) unless explicit scrap is set
    const isPassiveSmt = Boolean(packageFootprint && /^(0201|0402|0603|0805|1206|C0|R0|SMD)/i.test(packageFootprint.trim()));
    const effectiveScrap = scrapPercentage > 0 ? scrapPercentage : (isPassiveSmt ? 3 : 0);
    const scrapMultiplier = 1 + Math.max(0, effectiveScrap) / 100;
    return Number((quantity * scrapMultiplier).toFixed(4));
  }

  /**
   * Calculate compounded demand across multi-level nested sub-assemblies
   */
  public static calculateCompoundedDemand(
    levels: Array<{ quantity: number; scrapPercentage: number }>
  ): number {
    if (levels.length === 0) return 0;
    let total = 1;
    for (const level of levels) {
      const effective = level.quantity * (1 + (level.scrapPercentage || 0) / 100);
      total *= effective;
    }
    return Number(total.toFixed(4));
  }

  /**
   * Cycle Detection using Depth First Search (DFS)
   */
  public static detectCycleInGraph(startNodeId: string, graph: Map<string, string[]>): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string) => {
      visited.add(node);
      recursionStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recursionStack.has(neighbor)) {
          const cyclePath = [...path, neighbor].join(" -> ");
          throw new Error(`Circular dependency detected in BOM hierarchy: ${cyclePath}`);
        }
      }

      path.pop();
      recursionStack.delete(node);
    };

    dfs(startNodeId);
  }

  /**
   * Compute shortages for target production quantity
   */
  public static computeShortages(components: Array<any>): {
    hasShortage: boolean;
    shortages: ShortageItem[];
  } {
    const shortages: ShortageItem[] = [];

    for (const comp of components) {
      const required = comp.requiredQuantity ?? 0;
      const current = comp.currentStock ?? 0;
      const diff = required - current;

      if (diff > 0) {
        // Check alternates
        const approvedAlts = (comp.alternates || []).filter(
          (a: any) => a.approvalStatus === "APPROVED" && (a.currentStock || 0) >= diff
        );

        const suggested = approvedAlts.length > 0 ? approvedAlts[0] : undefined;

        shortages.push({
          itemId: comp.id,
          sku: comp.sku || comp.id,
          name: comp.name || comp.id,
          mpn: comp.mpn,
          requiredQuantity: required,
          currentStock: current,
          missingQuantity: diff,
          canFulfillWithAlternates: !!suggested,
          suggestedAlternate: suggested
            ? { id: suggested.id, name: suggested.name, currentStock: suggested.currentStock }
            : undefined,
        });
      }
    }

    return {
      hasShortage: shortages.length > 0,
      shortages,
    };
  }

  /**
   * Return standard floor life seconds for MSL rating per JEDEC J-STD-033D
   */
  public static getDefaultMslFloorLifeSeconds(mslRating: string = "MSL 1"): number {
    const normalized = mslRating.toUpperCase().replace(/\s+/g, " ").trim();
    switch (normalized) {
      case "MSL 1":
        return Infinity; // Unlimited
      case "MSL 2":
        return 365 * 24 * 3600; // 1 year
      case "MSL 2A":
        return 4 * 7 * 24 * 3600; // 4 weeks
      case "MSL 3":
        return 168 * 3600; // 168 hours (7 days)
      case "MSL 4":
        return 72 * 3600; // 72 hours (3 days)
      case "MSL 5":
        return 48 * 3600; // 48 hours (2 days)
      case "MSL 5A":
        return 24 * 3600; // 24 hours (1 day)
      case "MSL 6":
        return 6 * 3600; // 6 hours (Bake before use)
      default:
        return Infinity;
    }
  }

  /**
   * Compute remaining MSL floor life after exposure duration
   */
  public static computeRemainingFloorLife(
    initialFloorLifeSeconds: number,
    openTimestamp: Date,
    currentTimestamp: Date = new Date()
  ): number {
    if (initialFloorLifeSeconds === Infinity) return Infinity;

    const elapsedSeconds = Math.max(
      0,
      Math.floor((currentTimestamp.getTime() - new Date(openTimestamp).getTime()) / 1000)
    );

    return Math.max(0, initialFloorLifeSeconds - elapsedSeconds);
  }

  /**
   * Verify whether a bake cycle meets J-STD-033D parameters to reset MSL floor life
   */
  public static isValidBakeCycle(bakeTempC: number, bakeHours: number): boolean {
    if (bakeTempC >= 125 && bakeHours >= 24) return true;
    if (bakeTempC >= 90 && bakeHours >= 48) return true;
    if (bakeTempC >= 40 && bakeHours >= 192) return true;
    return false;
  }

  /**
   * Generate deterministic child lot number for reel fractionation
   */
  public static generateChildLotNumber(parentLotNumber: string, splitIndex: number = 1): string {
    return `${parentLotNumber}-C${splitIndex}`;
  }

  // ==========================================
  // Database Query & Transaction Operations
  // ==========================================

  /**
   * Get recursive assembly tree for an item
   */
  public static async getAssemblyTree(
    parentItemId: string,
    organizationId: string
  ): Promise<{ rootItem: any; tree: TreeNode[]; totalAssemblyCost: number }> {
    const rootItem = await this.itemRepo.findOne({
      where: { id: parentItemId, organization_id: organizationId },
    });

    if (!rootItem) {
      throw new Error(`Parent assembly item ${parentItemId} not found.`);
    }

    // Fetch all BOM nodes and alternates for this organization
    const allNodes = await this.bomRepo.find({
      where: { organization_id: organizationId },
      relations: ["child_item", "alternates", "alternates.alternate_item"],
    });

    // Build adjacency graph to detect cycles
    const graph = new Map<string, string[]>();
    for (const node of allNodes) {
      const list = graph.get(node.parent_item_id) || [];
      list.push(node.child_item_id);
      graph.set(node.parent_item_id, list);
    }

    this.detectCycleInGraph(parentItemId, graph);

    // Recursively build tree structure
    let totalAssemblyCost = 0;

    const buildSubTree = (currentParentId: string, currentLevel: number, currentPath: string[]): TreeNode[] => {
      const childNodes = allNodes.filter((n) => n.parent_item_id === currentParentId);
      const result: TreeNode[] = [];

      for (const node of childNodes) {
        const childItem = node.child_item;
        if (!childItem) continue;

        const effectiveQty = this.calculateEffectiveQuantity(
          Number(node.quantity),
          Number(node.scrap_percentage),
          childItem.package_footprint
        );

        const unitCost = Number(childItem.base_price || 0);
        const extCost = unitCost * effectiveQty;
        if (!node.do_not_populate) {
          totalAssemblyCost += extCost;
        }

        const stockQty = childItem.quantity || 0;
        let stockStatus: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" = "IN_STOCK";
        if (stockQty <= 0) stockStatus = "OUT_OF_STOCK";
        else if (stockQty <= (childItem.threshold || 5)) stockStatus = "LOW_STOCK";

        const mappedAlternates = (node.alternates || []).map((alt) => ({
          id: alt.id,
          alternateItemId: alt.alternate_item_id,
          sku: alt.alternate_item?.sku || "",
          name: alt.alternate_item?.name || "",
          mpn: alt.alternate_item?.mpn,
          currentStock: alt.alternate_item?.quantity || 0,
          preferenceRank: alt.preference_rank,
          approvalStatus: alt.approval_status,
        }));

        const subChildren = buildSubTree(node.child_item_id, currentLevel + 1, [...currentPath, node.child_item_id]);

        result.push({
          id: node.id,
          bomNodeId: node.id,
          itemId: childItem.id,
          sku: childItem.sku,
          name: childItem.name,
          mpn: childItem.mpn,
          packageFootprint: childItem.package_footprint,
          mountingType: childItem.mounting_type,
          mslRating: childItem.msl_rating,
          unitCost,
          quantityPerAssembly: Number(node.quantity),
          scrapPercentage: Number(node.scrap_percentage),
          effectiveQuantity: effectiveQty,
          referenceDesignators: node.reference_designators || [],
          assemblyPhase: node.assembly_phase,
          doNotPopulate: node.do_not_populate,
          notes: node.notes,
          level: currentLevel,
          path: currentPath,
          currentStock: stockQty,
          stockStatus,
          extendedCost: extCost,
          alternates: mappedAlternates,
          children: subChildren,
        });
      }

      return result;
    };

    const tree = buildSubTree(parentItemId, 1, [parentItemId]);

    return {
      rootItem,
      tree,
      totalAssemblyCost: Number(totalAssemblyCost.toFixed(2)),
    };
  }

  /**
   * Production Run Shortage Analyzer
   */
  public static async analyzeProductionShortages(
    parentItemId: string,
    buildQuantity: number,
    organizationId: string
  ): Promise<ShortageAnalysisResult> {
    const { tree } = await this.getAssemblyTree(parentItemId, organizationId);

    const leafComponents: Array<any> = [];

    const collectLeaves = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.doNotPopulate) continue;
        if (node.children.length > 0) {
          collectLeaves(node.children);
        } else {
          leafComponents.push({
            id: node.itemId,
            sku: node.sku,
            name: node.name,
            mpn: node.mpn,
            requiredQuantity: node.effectiveQuantity * buildQuantity,
            currentStock: node.currentStock,
            alternates: node.alternates,
          });
        }
      }
    };

    collectLeaves(tree);

    const { hasShortage, shortages } = this.computeShortages(leafComponents);

    return {
      parentItemId,
      buildQuantity,
      hasShortage,
      totalComponentsRequired: leafComponents.length,
      criticalShortageCount: shortages.filter((s) => !s.canFulfillWithAlternates).length,
      shortages,
    };
  }

  /**
   * Split a master reel into a child cut-tape / sample lot (with pessimistic row locking)
   */
  public static async splitReelToCutTape(params: {
    parentLotId: string;
    splitQuantity: number;
    targetPackageType?: "CUT_TAPE" | "FULL_REEL" | "TUBE_STICK" | "TRAY" | "BULK_BAG" | "SAMPLE_BOX";
    targetFeederSlot?: string;
    organizationId: string;
    user?: any;
  }) {
    const { parentLotId, splitQuantity, targetPackageType = "CUT_TAPE", targetFeederSlot, organizationId } = params;

    if (splitQuantity <= 0) {
      throw new Error("Split quantity must be greater than 0");
    }

    return await AppDataSource.transaction("READ COMMITTED", async (manager) => {
      // 1. Pessimistic lock on parent lot
      const parentLot = await manager
        .createQueryBuilder(StockLot, "lot")
        .setLock("pessimistic_write")
        .where("lot.id = :id AND lot.organization_id = :orgId", { id: parentLotId, orgId: organizationId })
        .getOne();

      if (!parentLot) {
        throw new Error(`Master reel lot ${parentLotId} not found.`);
      }

      if (Number(parentLot.current_quantity) < splitQuantity) {
        throw new Error(
          `Insufficient quantity in master reel. Available: ${parentLot.current_quantity}, Requested: ${splitQuantity}`
        );
      }

      // 2. Count existing child splits
      const childSplitCount = await manager.count(StockLot, {
        where: { parent_lot_id: parentLot.id, organization_id: organizationId },
      });

      const childLotNumber = this.generateChildLotNumber(parentLot.lot_number, childSplitCount + 1);

      // 3. Decrement parent lot
      const newParentQty = Number(parentLot.current_quantity) - splitQuantity;
      parentLot.current_quantity = newParentQty;
      if (newParentQty <= 0) {
        parentLot.status = "DEPLETED";
      }
      await manager.save(StockLot, parentLot);

      // 4. Create child lot
      const childLot = manager.create(StockLot, {
        organization_id: organizationId,
        item_id: parentLot.item_id,
        parent_lot_id: parentLot.id,
        lot_number: childLotNumber,
        supplier_lot_number: parentLot.supplier_lot_number,
        vendor_id: parentLot.vendor_id,
        manufacture_date: parentLot.manufacture_date,
        expiry_date: parentLot.expiry_date,
        received_date: new Date(),
        status: "RELEASED",
        initial_quantity: splitQuantity,
        current_quantity: splitQuantity,
        unit_cost: parentLot.unit_cost,
        package_type: targetPackageType,
        floor_life_seconds_remaining: parentLot.floor_life_seconds_remaining,
        feeder_slot: targetFeederSlot || parentLot.feeder_slot,
        reel_diameter: parentLot.reel_diameter,
        tape_width: parentLot.tape_width,
        notes: `Fractionated from parent reel ${parentLot.lot_number} (${splitQuantity} pcs)`,
      });

      const savedChildLot = await manager.save(StockLot, childLot);

      // 5. Generate 2D Barcode Data (GS1 / DataMatrix)
      const barcodeData = `(01)${parentLot.item_id.slice(0, 14)}(10)${savedChildLot.lot_number}(30)${splitQuantity}`;

      return {
        parentLot,
        childLot: savedChildLot,
        barcodeData,
      };
    });
  }

  /**
   * Update MSL exposure status (OPEN / SEAL / BAKE)
   */
  public static async updateMslStatus(params: {
    lotId: string;
    action: "OPEN" | "SEAL" | "BAKE";
    bakeTempC?: number;
    bakeHours?: number;
    organizationId: string;
    operatorId?: string;
  }) {
    const { lotId, action, bakeTempC = 125, bakeHours = 24, organizationId, operatorId } = params;

    return await AppDataSource.transaction("READ COMMITTED", async (manager) => {
      const lot = await manager.findOne(StockLot, {
        where: { id: lotId, organization_id: organizationId },
        relations: ["item"],
      });

      if (!lot) {
        throw new Error(`Stock lot ${lotId} not found.`);
      }

      const mslRating = lot.item?.msl_rating || "MSL 1";
      const defaultFloorLife = this.getDefaultMslFloorLifeSeconds(mslRating);

      if (action === "OPEN") {
        lot.msl_open_timestamp = new Date();
        if (lot.floor_life_seconds_remaining === null || lot.floor_life_seconds_remaining === undefined) {
          lot.floor_life_seconds_remaining = defaultFloorLife === Infinity ? undefined : defaultFloorLife;
        }
      } else if (action === "SEAL") {
        if (lot.msl_open_timestamp && lot.floor_life_seconds_remaining !== undefined) {
          lot.floor_life_seconds_remaining = this.computeRemainingFloorLife(
            lot.floor_life_seconds_remaining,
            lot.msl_open_timestamp
          );
          lot.msl_open_timestamp = undefined;
        }
      } else if (action === "BAKE") {
        if (this.isValidBakeCycle(bakeTempC, bakeHours)) {
          lot.floor_life_seconds_remaining = defaultFloorLife === Infinity ? undefined : defaultFloorLife;
          lot.msl_open_timestamp = undefined;

          const history = Array.isArray(lot.msl_bake_history) ? lot.msl_bake_history : [];
          history.push({
            baked_at: new Date().toISOString(),
            temperature_c: bakeTempC,
            duration_hours: bakeHours,
            operator_id: operatorId,
          });
          lot.msl_bake_history = history;
        } else {
          throw new Error(
            `Bake cycle (${bakeTempC}°C for ${bakeHours}h) does not satisfy J-STD-033D recovery parameters.`
          );
        }
      }

      return await manager.save(StockLot, lot);
    });
  }

  /**
   * Generates vendor-formatted Purchase Order CSV from shortage items
   * Supports: LCSC, Robu.in, QuartzComponents, Mouser India
   */
  public static generateVendorPoCsv(
    shortages: ShortageItem[],
    vendor: "LCSC" | "ROBU" | "QUARTZ" | "MOUSER"
  ): string {
    if (!shortages || shortages.length === 0) return "";

    if (vendor === "LCSC") {
      // LCSC BOM Import Format: LCSC Part Number,Manufacturer Part Number,Package,Quantity
      const header = "LCSC Part Number,Manufacturer Part Number,Package,Quantity\n";
      const rows = shortages.map((s: any) => {
        const lcscMpn = s.mpn || s.sku || "";
        const pkg = s.packageFootprint || "SMD";
        const qty = s.shortageQuantity ?? s.missingQuantity ?? 0;
        return `"${lcscMpn}","${s.mpn || ""}","${pkg}",${qty}`;
      });
      return header + rows.join("\n");
    } else if (vendor === "ROBU") {
      // Robu.in Format: SKU,Product Name,Quantity
      const header = "SKU,Product Name,Quantity\n";
      const rows = shortages.map((s: any) => {
        const qty = s.shortageQuantity ?? s.missingQuantity ?? 0;
        return `"${s.sku || s.mpn}","${(s.name || s.mpn).replace(/"/g, '""')}",${qty}`;
      });
      return header + rows.join("\n");
    } else if (vendor === "QUARTZ") {
      // QuartzComponents Format: Part Number,Description,Quantity
      const header = "Part Number,Description,Quantity\n";
      const rows = shortages.map((s: any) => {
        const qty = s.shortageQuantity ?? s.missingQuantity ?? 0;
        return `"${s.mpn || s.sku}","${(s.name || s.mpn).replace(/"/g, '""')}",${qty}`;
      });
      return header + rows.join("\n");
    } else {
      // Mouser India Format: Mouser Part Number,Manufacturer Part Number,Quantity
      const header = "Mouser Part Number,Manufacturer Part Number,Quantity\n";
      const rows = shortages.map((s: any) => {
        const qty = s.shortageQuantity ?? s.missingQuantity ?? 0;
        return `,"${s.mpn || s.sku}",${qty}`;
      });
      return header + rows.join("\n");
    }
  }
}
