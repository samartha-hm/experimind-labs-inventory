import { AppDataSource } from "../db.ts";
import { StockLedger, StockTransactionType } from "../entity/StockLedger.ts";
import { InventoryItem } from "../entity/InventoryItem.ts";

export interface PostLedgerEntryParams {
  organizationId?: string;
  itemId: string;
  itemName?: string;
  itemSku?: string;
  warehouseId?: string;
  binLocation?: string;
  lotNumber?: string;
  serialNumber?: string;
  qtyDelta: number;
  unitCost?: number;
  transactionType: StockTransactionType;
  referenceType?: string;
  referenceId?: string;
  reasonCode?: string;
  notes?: string;
  actorId?: string;
  actorName?: string;
}

export class StockLedgerService {
  private static ledgerRepo = AppDataSource.getRepository(StockLedger);
  private static itemRepo = AppDataSource.getRepository(InventoryItem);

  /**
   * Atomically posts a stock movement to the immutable ledger and updates the item's on-hand quantity
   * using PostgreSQL strict database ACID transactions with pessimistic row locking (SELECT FOR UPDATE).
   */
  public static async postEntry(params: PostLedgerEntryParams): Promise<StockLedger> {
    const orgId = params.organizationId || "00000000-0000-0000-0000-000000000000";

    return await AppDataSource.transaction("READ COMMITTED", async (transactionalEntityManager) => {
      // 1. Acquire pessimistic row lock (SELECT ... FOR UPDATE) on target inventory item
      const item = await transactionalEntityManager.findOne(InventoryItem, {
        where: { id: params.itemId },
        lock: { mode: "pessimistic_write" },
      });

      if (!item) {
        throw new Error(`Inventory item not found for ID: ${params.itemId}`);
      }

      const currentQty = Number(item.quantity || 0);
      const newRunningBalance = currentQty + Number(params.qtyDelta);

      if (newRunningBalance < 0 && params.qtyDelta < 0) {
        throw new Error(
          `Insufficient stock for SKU ${item.sku}: Available ${currentQty}, requested deduction ${Math.abs(params.qtyDelta)}`
        );
      }

      // 2. Create and insert immutable ledger entry inside the same atomic transaction
      const ledgerEntry = transactionalEntityManager.create(StockLedger, {
        organization_id: orgId,
        item_id: item.id,
        item_name: params.itemName || item.name,
        item_sku: params.itemSku || item.sku,
        warehouse_id: params.warehouseId,
        bin_location: params.binLocation || item.bin_location,
        lot_number: params.lotNumber,
        serial_number: params.serialNumber,
        qty_delta: params.qtyDelta,
        unit_cost: params.unitCost !== undefined ? params.unitCost : Number(item.base_price || 0),
        running_balance: newRunningBalance,
        transaction_type: params.transactionType,
        reference_type: params.referenceType,
        reference_id: params.referenceId,
        reason_code: params.reasonCode || `${params.transactionType} Execution`,
        notes: params.notes,
        actor_id: params.actorId,
        actor_name: params.actorName || "System Operator",
      });

      const savedEntry = await transactionalEntityManager.save(StockLedger, ledgerEntry);

      // 3. Update locked inventory item on-hand balance and location
      item.quantity = newRunningBalance;
      if (params.binLocation && params.binLocation.trim()) {
        item.bin_location = params.binLocation.trim();
      }
      item.updated_at = new Date();
      await transactionalEntityManager.save(InventoryItem, item);

      return savedEntry;
    });
  }

  /**
   * Lists ledger entries with flexible enterprise filtering
   */
  public static async listEntries(filters: {
    organizationId?: string;
    itemId?: string;
    binLocation?: string;
    transactionType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const orgId = filters.organizationId || "00000000-0000-0000-0000-000000000000";
    const qb = this.ledgerRepo.createQueryBuilder("l")
      .where("l.organization_id = :orgId", { orgId })
      .orderBy("l.created_at", "DESC");

    if (filters.itemId) {
      qb.andWhere("l.item_id = :itemId", { itemId: filters.itemId });
    }

    if (filters.binLocation) {
      qb.andWhere("l.bin_location = :binLocation", { binLocation: filters.binLocation });
    }

    if (filters.transactionType && filters.transactionType !== "ALL") {
      qb.andWhere("l.transaction_type = :type", { type: filters.transactionType });
    }

    if (filters.search) {
      const term = `%${filters.search.toLowerCase()}%`;
      qb.andWhere(
        "(LOWER(l.item_name) LIKE :term OR LOWER(l.item_sku) LIKE :term OR LOWER(l.reference_id) LIKE :term OR LOWER(l.reason_code) LIKE :term)",
        { term }
      );
    }

    const limit = filters.limit || 100;
    const offset = filters.offset || 0;

    const [entries, total] = await qb.skip(offset).take(limit).getManyAndCount();
    return { entries, total };
  }

  /**
   * Computes real-time Inventory Valuation Summary
   */
  public static async getValuationSummary(orgId: string = "00000000-0000-0000-0000-000000000000") {
    const items = await this.itemRepo.find({
      where: { organization_id: orgId },
    });

    let totalAssetValue = 0;
    let totalUnitsOnHand = 0;
    const breakdown = items.map((item) => {
      const qty = Number(item.quantity || 0);
      const cost = Number(item.base_price || 0);
      const lineVal = qty * cost;
      totalAssetValue += lineVal;
      totalUnitsOnHand += qty;
      return {
        id: item.id,
        name: item.name,
        sku: item.sku,
        binLocation: item.bin_location,
        quantity: qty,
        unitCost: cost,
        totalValue: lineVal,
      };
    });

    return {
      totalAssetValue: Number(totalAssetValue.toFixed(2)),
      totalUnitsOnHand,
      itemCount: items.length,
      items: breakdown,
    };
  }
}
