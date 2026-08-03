import { InventoryItem, KitBOM, KittingAnalysis, BottleneckItem } from '../types';

/**
 * Calculates kitting feasibility, bottlenecks, and shortages for a target quantity.
 */
export function analyzeKitting(
  inventory: InventoryItem[],
  kit: KitBOM,
  targetQty: number
): KittingAnalysis {
  let maxKitsPossible = Infinity;
  const bottlenecks: BottleneckItem[] = [];
  const missingComponents: KittingAnalysis['missingComponents'] = [];

  const items = kit?.items || [];
  
  // 1. Determine how many kits can be fully packed, and identify bottlenecks
  items.forEach((req) => {
    const item = inventory.find((inv) => inv.id === req.componentId);
    if (!item) return;

    // Common/unlimited stock items don't limit packing
    if (item.isCommon) {
      return;
    }

    const available = item.stockQty;
    const requiredPerKit = req.qty;
    const kitsPossible = Math.floor(available / requiredPerKit);

    if (kitsPossible < maxKitsPossible) {
      maxKitsPossible = kitsPossible;
    }

    bottlenecks.push({
      componentId: req.componentId,
      name: item.name,
      requiredPerKit,
      available,
      maxKitsPossible: kitsPossible,
    });
  });

  if (maxKitsPossible === Infinity) {
    maxKitsPossible = 0;
  }

  // Sort bottlenecks so the most limiting ones are first
  bottlenecks.sort((a, b) => a.maxKitsPossible - b.maxKitsPossible);

  // 2. Calculate shortages for the target quantity
  items.forEach((req) => {
    const item = inventory.find((inv) => inv.id === req.componentId);
    if (!item) return;

    // Common items do not count towards shortages unless needed
    const requiredTotal = req.qty * targetQty;
    const available = item.stockQty;
    const shortage = Math.max(0, requiredTotal - available);

    if (shortage > 0 && !item.isCommon) {
      missingComponents.push({
        componentId: req.componentId,
        name: item.name,
        requiredTotal,
        available,
        shortage,
      });
    }
  });

  return {
    maxKitsPossible,
    bottlenecks: bottlenecks.slice(0, 5), // return top 5 bottlenecks
    missingComponents,
  };
}
