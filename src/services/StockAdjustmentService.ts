import { StockAdjustment } from "../entity/StockAdjustment.ts";
import { InventoryService } from "./InventoryService.ts";
import { AppDataSource } from "../db.ts";

export class StockAdjustmentService {
  private inventoryService = new InventoryService();

  async createAdjustment(dto: {
    organization_id: string;
    inventory_item_id: string;
    qty_diff: number;
    reason_code: "cycle_count" | "damaged" | "expired" | "lost" | "found";
    notes?: string;
    actor_id: string;
  }): Promise<StockAdjustment> {
    const validReasons = ["cycle_count", "damaged", "expired", "lost", "found"];
    if (!validReasons.includes(dto.reason_code)) {
      throw new Error(`Invalid stock adjustment reason code: ${dto.reason_code}. Allowed: ${validReasons.join(", ")}`);
    }

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Perform thread-safe stock adjustment
      await this.inventoryService.adjustStockWithTransaction(
        dto.inventory_item_id,
        dto.qty_diff,
        dto.actor_id,
        dto.organization_id,
        `Stock Adjustment (${dto.reason_code}): ${dto.notes || 'N/A'}`
      );

      // 2. Persist stock adjustment record
      const repo = queryRunner.manager.getRepository(StockAdjustment);
      const adjustment = repo.create(dto);
      const saved = await repo.save(adjustment);

      await queryRunner.commitTransaction();
      return saved;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
