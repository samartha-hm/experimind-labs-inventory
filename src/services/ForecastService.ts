import { AppDataSource } from "../db.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";
import { StockLedger } from "../entity/StockLedger.ts";

export type ReorderUrgency = "OUT_OF_STOCK" | "CRITICAL" | "REORDER_RECOMMENDED" | "HEALTHY";

export interface ItemForecastMetric {
  itemId: string;
  sku: string;
  name: string;
  category?: string;
  currentStock: number;
  staticThreshold: number;
  consumed30Days: number;
  dailyVelocity: number;
  leadTimeDays: number;
  leadTimeDemand: number;
  safetyStock: number;
  dynamicReorderPoint: number;
  suggestedOrderQty: number;
  runoutDaysEstimate: number | null;
  urgency: ReorderUrgency;
}

export interface ReorderForecastSummary {
  totalItemsAnalyzed: number;
  outOfStockCount: number;
  criticalCount: number;
  reorderRecommendedCount: number;
  healthyCount: number;
  totalSuggestedOrderUnits: number;
  items: ItemForecastMetric[];
}

export class ForecastService {
  /**
   * Pure calculation helper: Computes dynamic safety stock, reorder point,
   * runout estimate, and suggested order quantity.
   */
  public static computeItemForecast(params: {
    itemId: string;
    sku: string;
    name: string;
    category?: string;
    currentStock: number;
    staticThreshold: number;
    consumed30Days: number;
    leadTimeDays?: number;
    serviceLevelZ?: number; // 1.65 for 95% service level
  }): ItemForecastMetric {
    const leadTimeDays = params.leadTimeDays && params.leadTimeDays > 0 ? params.leadTimeDays : 7;
    const serviceLevelZ = params.serviceLevelZ && params.serviceLevelZ > 0 ? params.serviceLevelZ : 1.65;

    const consumed30Days = Math.max(0, Number(params.consumed30Days || 0));
    const dailyVelocity = Number((consumed30Days / 30).toFixed(2));
    const leadTimeDemand = Number((dailyVelocity * leadTimeDays).toFixed(2));

    // Statistical buffer: std dev approximation using 50% velocity variance
    const stdDevEstimate = dailyVelocity * 0.5;
    const safetyStock = Math.max(
      1,
      Math.ceil(serviceLevelZ * Math.sqrt(leadTimeDays) * (stdDevEstimate > 0 ? stdDevEstimate : 1))
    );

    const dynamicReorderPoint = Math.max(
      params.staticThreshold || 5,
      Math.ceil(leadTimeDemand + safetyStock)
    );

    const currentStock = Number(params.currentStock || 0);

    let urgency: ReorderUrgency = "HEALTHY";
    if (currentStock <= 0) {
      urgency = "OUT_OF_STOCK";
    } else if (currentStock <= safetyStock) {
      urgency = "CRITICAL";
    } else if (currentStock <= dynamicReorderPoint) {
      urgency = "REORDER_RECOMMENDED";
    }

    let suggestedOrderQty = 0;
    if (currentStock <= dynamicReorderPoint) {
      const targetMax = Math.max(dynamicReorderPoint * 2, (params.staticThreshold || 5) * 2);
      suggestedOrderQty = Math.max(1, targetMax - currentStock);
    }

    const runoutDaysEstimate =
      dailyVelocity > 0 ? Math.round(currentStock / dailyVelocity) : null;

    return {
      itemId: params.itemId,
      sku: params.sku,
      name: params.name,
      category: params.category,
      currentStock,
      staticThreshold: params.staticThreshold,
      consumed30Days,
      dailyVelocity,
      leadTimeDays,
      leadTimeDemand,
      safetyStock,
      dynamicReorderPoint,
      suggestedOrderQty,
      runoutDaysEstimate,
      urgency,
    };
  }

  /**
   * Database method: Analyzes real 30-day ledger consumption history across all items
   * and generates reorder forecasting metrics.
   */
  public static async getReorderRecommendations(
    organizationId: string = "00000000-0000-0000-0000-000000000000",
    options?: { leadTimeDays?: number; serviceLevelZ?: number }
  ): Promise<ReorderForecastSummary> {
    const itemRepo = AppDataSource.getRepository(InventoryItem);
    const ledgerRepo = AppDataSource.getRepository(StockLedger);

    const items = await itemRepo.find({
      where: { organization_id: organizationId },
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Query 30-day consumption movements (negative qty_delta)
    const consumptionEntries = await ledgerRepo
      .createQueryBuilder("l")
      .select("l.item_id", "itemId")
      .addSelect("SUM(ABS(l.qty_delta))", "totalConsumed")
      .where("l.organization_id = :orgId", { orgId: organizationId })
      .andWhere("l.created_at >= :since", { since: thirtyDaysAgo })
      .andWhere("l.qty_delta < 0")
      .groupBy("l.item_id")
      .getRawMany();

    const consumptionMap = new Map<string, number>();
    for (const entry of consumptionEntries) {
      consumptionMap.set(entry.itemId, Number(entry.totalConsumed || 0));
    }

    const metrics: ItemForecastMetric[] = items.map((item) => {
      const consumed30Days = consumptionMap.get(item.id) || 0;
      return this.computeItemForecast({
        itemId: item.id,
        sku: item.sku,
        name: item.name,
        category: item.category,
        currentStock: item.quantity,
        staticThreshold: item.threshold,
        consumed30Days,
        leadTimeDays: options?.leadTimeDays,
        serviceLevelZ: options?.serviceLevelZ,
      });
    });

    // Sort by urgency priority: OUT_OF_STOCK -> CRITICAL -> REORDER_RECOMMENDED -> HEALTHY
    const urgencyPriority: Record<ReorderUrgency, number> = {
      OUT_OF_STOCK: 0,
      CRITICAL: 1,
      REORDER_RECOMMENDED: 2,
      HEALTHY: 3,
    };

    metrics.sort((a, b) => urgencyPriority[a.urgency] - urgencyPriority[b.urgency]);

    return {
      totalItemsAnalyzed: metrics.length,
      outOfStockCount: metrics.filter((m) => m.urgency === "OUT_OF_STOCK").length,
      criticalCount: metrics.filter((m) => m.urgency === "CRITICAL").length,
      reorderRecommendedCount: metrics.filter((m) => m.urgency === "REORDER_RECOMMENDED").length,
      healthyCount: metrics.filter((m) => m.urgency === "HEALTHY").length,
      totalSuggestedOrderUnits: metrics.reduce((sum, m) => sum + m.suggestedOrderQty, 0),
      items: metrics,
    };
  }
}
