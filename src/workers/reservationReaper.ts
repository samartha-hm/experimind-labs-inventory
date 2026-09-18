/**
 * Automated Orphan Reservation Reaper Worker
 * Zero-Drift Background Reconciler for Experimind Labs
 * 
 * Reconciles Redis/in-memory soft-locks against PostgreSQL database records.
 * Identifies expired checkout sessions (>15 min TTL) and orphan locks,
 * decrements reserved quantities, releases stock back to the public pool,
 * and broadcasts real-time SSE updates.
 */

import { AppDataSource } from '../db.ts';
import { InventoryItem } from '../entity/InventoryItem.ts';
import { CartReservationService, SoftLockReservation } from '../services/CartReservationService.ts';
import { RealTimeEventService } from '../services/RealTimeEventService.ts';

export interface ReaperResult {
  reapedAt: string;
  expiredReservationsCount: number;
  reconciledItemsCount: number;
  totalQuantityReleased: number;
  reapedItemSkus: string[];
}

/**
 * Executes a single reconciliation pass across all item reservations
 */
export async function reapOrphanReservations(): Promise<ReaperResult> {
  const now = new Date();
  const activeLocks = CartReservationService.getActiveReservations();
  
  const expiredLocks: SoftLockReservation[] = [];
  const validLocksByItem = new Map<string, number>();

  for (const lock of activeLocks) {
    if (new Date(lock.expiresAt) <= now) {
      expiredLocks.push(lock);
    } else {
      const current = validLocksByItem.get(lock.itemId) || 0;
      validLocksByItem.set(lock.itemId, current + lock.quantity);
    }
  }

  // Release expired locks in service
  let totalQuantityReleased = 0;
  const reapedItemSkusSet = new Set<string>();

  for (const exp of expiredLocks) {
    totalQuantityReleased += exp.quantity;
    if (exp.itemSku) reapedItemSkusSet.add(exp.itemSku);
    await CartReservationService.releaseStock({
      cartId: exp.cartId,
      itemId: exp.itemId
    });
  }

  // Reconcile database items if database is initialized
  let reconciledItemsCount = 0;
  if (AppDataSource.isInitialized) {
    const itemRepo = AppDataSource.getRepository(InventoryItem);

    for (const [itemId, validReservedCount] of validLocksByItem.entries()) {
      try {
        const item = await itemRepo.findOne({ where: { id: itemId } });
        if (item) {
          const currentReserved = Number(item.reserved_quantity || 0);
          if (currentReserved !== validReservedCount) {
            item.reserved_quantity = validReservedCount;
            await itemRepo.save(item);
            reconciledItemsCount++;

            RealTimeEventService.broadcastStockUpdate(
              item.organization_id || "00000000-0000-0000-0000-000000000000",
              item.id,
              Math.max(0, Number(item.quantity || 0) - validReservedCount),
              item.bin_location
            );
          }
        }
      } catch (err) {
        // Continue reconciling other items
      }
    }
  }

  return {
    reapedAt: now.toISOString(),
    expiredReservationsCount: expiredLocks.length,
    reconciledItemsCount,
    totalQuantityReleased,
    reapedItemSkus: Array.from(reapedItemSkusSet)
  };
}

let reaperIntervalHandle: NodeJS.Timeout | null = null;

/**
 * Starts the automated reservation reaper worker on a recurring schedule
 * @param intervalMs Milliseconds between reaper runs (default: 5 minutes = 300,000ms)
 */
export function startReservationReaper(intervalMs: number = 300000): NodeJS.Timeout {
  if (reaperIntervalHandle) {
    clearInterval(reaperIntervalHandle);
  }

  console.log(`🧹 [Reaper] Automated Orphan Reservation Reaper registered (Interval: ${intervalMs / 1000}s)`);

  reaperIntervalHandle = setInterval(async () => {
    try {
      const result = await reapOrphanReservations();
      if (result.expiredReservationsCount > 0) {
        console.log(
          `🧹 [Reaper] Reaped ${result.expiredReservationsCount} expired reservations, released ${result.totalQuantityReleased} units across SKUs: ${result.reapedItemSkus.join(', ')}`
        );
      }
    } catch (err: any) {
      console.error(`❌ [Reaper Error]: ${err.message}`);
    }
  }, intervalMs);

  return reaperIntervalHandle;
}

/**
 * Stops the reaper interval
 */
export function stopReservationReaper(): void {
  if (reaperIntervalHandle) {
    clearInterval(reaperIntervalHandle);
    reaperIntervalHandle = null;
  }
}
