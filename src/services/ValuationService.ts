import { AppDataSource } from "../db.ts";
import { StockLot } from "../entity/StockLot.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";

export interface CostLayer {
  lotId?: string;
  lotNumber: string;
  receivedDate: Date | string;
  quantity: number;
  unitCost: number;
  totalLayerValue: number;
}

export interface ValuationResult {
  itemId: string;
  itemSku: string;
  itemName: string;
  totalQuantity: number;
  movingAverageCost: number;
  totalMovingAverageValue: number;
  totalFifoValue: number;
  layers: CostLayer[];
}

export interface CogsLayerConsumption {
  lotNumber: string;
  quantity: number;
  unitCost: number;
  subtotal: number;
}

export interface CogsResult {
  itemId: string;
  strategy: "FIFO" | "MOVING_AVERAGE";
  requestedQuantity: number;
  consumedQuantity: number;
  totalCogs: number;
  effectiveUnitCost: number;
  layersConsumed: CogsLayerConsumption[];
  remainingLayers: CostLayer[];
}

export class ValuationService {
  /**
   * Pure helper: Computes Weighted Moving Average Unit Cost across active inventory layers.
   */
  public static computeMovingAverage(layers: Array<{ quantity: number; unitCost: number }>): number {
    const totalQty = layers.reduce((sum, l) => sum + Math.max(0, Number(l.quantity || 0)), 0);
    if (totalQty <= 0) return 0;

    const totalVal = layers.reduce(
      (sum, l) => sum + Math.max(0, Number(l.quantity || 0)) * Number(l.unitCost || 0),
      0
    );
    return Number((totalVal / totalQty).toFixed(4));
  }

  /**
   * Pure helper: Simulates FIFO inventory consumption and calculates exact COGS
   * across ordered cost layers.
   */
  public static computeFifoCogs(
    layers: CostLayer[],
    quantityToConsume: number
  ): {
    totalCogs: number;
    effectiveUnitCost: number;
    layersConsumed: CogsLayerConsumption[];
    remainingLayers: CostLayer[];
  } {
    if (quantityToConsume <= 0 || layers.length === 0) {
      return {
        totalCogs: 0,
        effectiveUnitCost: 0,
        layersConsumed: [],
        remainingLayers: layers.map((l) => ({ ...l })),
      };
    }

    let remainingNeeded = Number(quantityToConsume);
    let totalCogs = 0;
    const layersConsumed: CogsLayerConsumption[] = [];
    const remainingLayers: CostLayer[] = [];

    for (const layer of layers) {
      const currentLayerQty = Number(layer.quantity || 0);
      if (currentLayerQty <= 0) continue;

      if (remainingNeeded > 0) {
        const take = Math.min(currentLayerQty, remainingNeeded);
        const subtotal = Number((take * Number(layer.unitCost || 0)).toFixed(4));
        totalCogs += subtotal;

        layersConsumed.push({
          lotNumber: layer.lotNumber,
          quantity: take,
          unitCost: Number(layer.unitCost || 0),
          subtotal,
        });

        remainingNeeded -= take;

        const leftInLayer = currentLayerQty - take;
        if (leftInLayer > 0) {
          remainingLayers.push({
            ...layer,
            quantity: leftInLayer,
            totalLayerValue: Number((leftInLayer * Number(layer.unitCost || 0)).toFixed(4)),
          });
        }
      } else {
        remainingLayers.push({ ...layer });
      }
    }

    const actualConsumed = quantityToConsume - remainingNeeded;
    const effectiveUnitCost =
      actualConsumed > 0 ? Number((totalCogs / actualConsumed).toFixed(4)) : 0;

    return {
      totalCogs: Number(totalCogs.toFixed(4)),
      effectiveUnitCost,
      layersConsumed,
      remainingLayers,
    };
  }

  /**
   * Calculates real-time valuation under both FIFO layers and Weighted Moving Average
   * for a specific inventory item in an organization.
   */
  public static async getValuation(
    itemId: string,
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ): Promise<ValuationResult> {
    const itemRepo = AppDataSource.getRepository(InventoryItem);
    const lotRepo = AppDataSource.getRepository(StockLot);

    const item = await itemRepo.findOne({
      where: { id: itemId, organization_id: orgId },
    });

    if (!item) {
      throw new Error(`Inventory item ${itemId} not found`);
    }

    // Retrieve all active released stock lots with positive current quantity
    const lots = await lotRepo.find({
      where: {
        item_id: itemId,
        organization_id: orgId,
        status: "RELEASED",
      },
      order: {
        received_date: "ASC",
        created_at: "ASC",
      },
    });

    const activeLots = lots.filter((l) => Number(l.current_quantity || 0) > 0);

    let layers: CostLayer[] = [];
    if (activeLots.length > 0) {
      layers = activeLots.map((lot) => ({
        lotId: lot.id,
        lotNumber: lot.lot_number,
        receivedDate: lot.received_date,
        quantity: Number(lot.current_quantity),
        unitCost: Number(lot.unit_cost || 0),
        totalLayerValue: Number((Number(lot.current_quantity) * Number(lot.unit_cost || 0)).toFixed(4)),
      }));
    } else {
      // If no distinct lots are tracked, use the on-hand item quantity with base_price
      const totalQty = Number(item.quantity || 0);
      const unitCost = Number(item.base_price || 0);
      layers = [
        {
          lotNumber: "DEFAULT-LAYER",
          receivedDate: item.updated_at || new Date(),
          quantity: totalQty,
          unitCost,
          totalLayerValue: Number((totalQty * unitCost).toFixed(4)),
        },
      ];
    }

    const totalQuantity = layers.reduce((sum, l) => sum + l.quantity, 0);
    const movingAverageCost = this.computeMovingAverage(layers);
    const totalMovingAverageValue = Number((totalQuantity * movingAverageCost).toFixed(2));
    const totalFifoValue = Number(layers.reduce((sum, l) => sum + l.totalLayerValue, 0).toFixed(2));

    return {
      itemId: item.id,
      itemSku: item.sku,
      itemName: item.name,
      totalQuantity,
      movingAverageCost,
      totalMovingAverageValue,
      totalFifoValue,
      layers,
    };
  }

  /**
   * Previews or calculates Cost of Goods Sold (COGS) for a specific consumption quantity
   * under either FIFO or Moving Average strategy.
   */
  public static async calculateCogs(
    itemId: string,
    quantityToConsume: number,
    strategy: "FIFO" | "MOVING_AVERAGE" = "FIFO",
    orgId: string = "00000000-0000-0000-0000-000000000000"
  ): Promise<CogsResult> {
    const valuation = await this.getValuation(itemId, orgId);

    if (strategy === "MOVING_AVERAGE") {
      const availableQty = valuation.totalQuantity;
      const consumedQty = Math.min(availableQty, quantityToConsume);
      const mac = valuation.movingAverageCost;
      const totalCogs = Number((consumedQty * mac).toFixed(4));
      const remainingQty = availableQty - consumedQty;

      return {
        itemId,
        strategy: "MOVING_AVERAGE",
        requestedQuantity: quantityToConsume,
        consumedQuantity: consumedQty,
        totalCogs,
        effectiveUnitCost: mac,
        layersConsumed: [
          {
            lotNumber: "MOVING_AVERAGE_POOL",
            quantity: consumedQty,
            unitCost: mac,
            subtotal: totalCogs,
          },
        ],
        remainingLayers: [
          {
            lotNumber: "MOVING_AVERAGE_POOL",
            receivedDate: new Date(),
            quantity: remainingQty,
            unitCost: mac,
            totalLayerValue: Number((remainingQty * mac).toFixed(4)),
          },
        ],
      };
    }

    // Default: FIFO Strategy
    const fifoResult = this.computeFifoCogs(valuation.layers, quantityToConsume);
    const actualConsumed = fifoResult.layersConsumed.reduce((sum, l) => sum + l.quantity, 0);

    return {
      itemId,
      strategy: "FIFO",
      requestedQuantity: quantityToConsume,
      consumedQuantity: actualConsumed,
      totalCogs: fifoResult.totalCogs,
      effectiveUnitCost: fifoResult.effectiveUnitCost,
      layersConsumed: fifoResult.layersConsumed,
      remainingLayers: fifoResult.remainingLayers,
    };
  }
}
