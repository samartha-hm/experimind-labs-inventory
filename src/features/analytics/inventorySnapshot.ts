import type { InventoryItem } from '../../types';

export type StockStatus = 'unlimited' | 'invalid' | 'out' | 'low' | 'ok';

/** Snapshot signals only: quantities do not establish reservations or future demand. */
export function stockStatus(item: Pick<InventoryItem, 'stockQty' | 'threshold' | 'isCommon'>): StockStatus {
  if (item.isCommon) return 'unlimited';
  if (!Number.isFinite(item.stockQty) || item.stockQty < 0 ||
      !Number.isFinite(item.threshold) || item.threshold < 0) return 'invalid';
  if (item.stockQty === 0) return 'out';
  return item.stockQty < item.threshold ? 'low' : 'ok';
}

export function summarizeInventory(items: readonly InventoryItem[]) {
  const counts: Record<StockStatus, number> = { unlimited: 0, invalid: 0, out: 0, low: 0, ok: 0 };
  for (const item of items) counts[stockStatus(item)]++;
  return { ...counts, total: items.length };
}
