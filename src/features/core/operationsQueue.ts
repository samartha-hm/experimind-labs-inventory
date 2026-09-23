import { InventoryItem, KitBOM } from '@/src/types';

export interface OperationsQueue {
  lowStock: number;
  replenishment: number;
  fulfillment: number;
  projects: number;
  total: number;
}

const openPurchaseStatuses = new Set(['DRAFT', 'ORDERED', 'PENDING', 'PENDING_APPROVAL', 'PARTIALLY_RECEIVED']);
const openSalesStatuses = new Set(['DRAFT', 'CONFIRMED', 'PROCESSING', 'PACKED', 'BACKORDERED']);

export function buildOperationsQueue(
  inventory: InventoryItem[],
  purchaseOrders: Array<{ status?: string | null }>,
  salesOrders: Array<{ status?: string | null }>,
  kits: KitBOM[],
): OperationsQueue {
  const lowStock = inventory.filter((item) => !item.isCommon && item.stockQty < item.threshold).length;
  const replenishment = purchaseOrders.filter((order) => openPurchaseStatuses.has(order.status?.toUpperCase() ?? '')).length;
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
