import { InventoryItem, KitBOM } from '@/src/types';
import { summarizeReplenishmentOrder, ReplenishmentOrder } from '../procurement/replenishmentStatus';

export interface OperationsQueue {
  lowStock: number;
  replenishment: number;
  fulfillment: number;
  projects: number;
  total: number;
}

const openSalesStatuses = new Set(['DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'BACKORDERED']);

export function buildOperationsQueue(
  inventory: InventoryItem[],
  purchaseOrders: ReplenishmentOrder[],
  salesOrders: Array<{ status?: string | null }>,
  kits: KitBOM[],
  today = new Date(),
): OperationsQueue {
  const lowStock = inventory.filter((item) => !item.isCommon && item.stockQty < item.threshold).length;
  const replenishment = purchaseOrders.filter((order) => {
    const status = summarizeReplenishmentOrder(order, today).status;
    return status !== 'received' && status !== 'cancelled';
  }).length;
  const fulfillment = salesOrders.filter((order) => openSalesStatuses.has(order.status?.toUpperCase() ?? '')).length;
  const projects = kits.length;

  return {
    lowStock,
    replenishment,
    fulfillment,
    projects,
    total: lowStock + replenishment + fulfillment,
  };
}
