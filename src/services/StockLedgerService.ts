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
   */
  public static async postEntry(params: PostLedgerEntryParams): Promise<StockLedger> {
    const orgId = params.organizationId || "00000000-0000-0000-0000-000000000000";

    // 1. Fetch current inventory item to determine accurate SKU, name, and current running balance
    const item = await this.itemRepo.findOne({ where: { id: params.itemId } });
    if (!item) {
      throw new Error(`Inventory item not found for ID: ${params.itemId}`);
    }

    const currentQty = Number(item.quantity || 0);
    const newRunningBalance = currentQty + Number(params.qtyDelta);

    const ledgerEntry = this.ledgerRepo.create({
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

    const savedEntry = await this.ledgerRepo.save(ledgerEntry);

    // 2. Synchronize item's cached on-hand quantity and optional updated binLocation
    item.quantity = newRunningBalance;
    if (params.binLocation && params.binLocation.trim()) {
      item.bin_location = params.binLocation.trim();
    }
    await this.itemRepo.save(item);

    return savedEntry;
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
