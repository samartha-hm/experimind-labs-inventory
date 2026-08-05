import { InventoryItem } from "../entity/InventoryItem";
import { AuditLog } from "../entity/AuditLog";
import { AppDataSource } from "../db.ts";

export class InventoryService {
  private get repo() {
    return AppDataSource.getRepository(InventoryItem);
  }

  async list(filters: {
    sku?: string;
    name?: string;
    lowStock?: boolean;
    outOfStock?: boolean;
    warehouseId?: string;
    organizationId?: string;
  }): Promise<InventoryItem[]> {
    const qb = this.repo.createQueryBuilder("item");
    if (filters.organizationId) {
      qb.andWhere("item.organization_id = :orgId", { orgId: filters.organizationId });
    }
    if (filters.sku) qb.andWhere("item.sku = :sku", { sku: filters.sku });
    if (filters.name)
      qb.andWhere("item.name ILIKE :name", { name: `%${filters.name}%` });
    if (filters.lowStock)
      qb.andWhere("item.quantity < item.threshold AND item.is_common = false");
    if (filters.outOfStock)
      qb.andWhere("item.quantity = 0 AND item.is_common = false");
    if (filters.warehouseId)
      qb.andWhere("item.warehouse_id = :wid", { wid: filters.warehouseId });
    return qb.getMany();
  }

  async create(dto: Partial<InventoryItem>): Promise<InventoryItem> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(
    id: string,
    changes: Partial<InventoryItem>
  ): Promise<InventoryItem> {
    await this.repo.update(id, changes);
    const updated = await this.repo.findOneByOrFail({ id });
    return updated;
  }

  /**
   * Thread-safe stock mutation with pessimistic row locking and audit logging.
   */
  async adjustStockWithTransaction(
    itemId: string,
    quantityDelta: number,
    actorId: string,
    organizationId: string,
    reason: string
  ): Promise<InventoryItem> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Pessimistic write lock to prevent race conditions & overselling
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: itemId, organization_id: organizationId },
        lock: { mode: "pessimistic_write" },
      });

      if (!item) {
        throw new Error(`Inventory item ${itemId} not found`);
      }

      const previousQty = item.quantity;
      const newQuantity = previousQty + quantityDelta;

      if (newQuantity < 0 && !item.is_common) {
        throw new Error(`Insufficient stock for item '${item.name}' (${item.sku}). Requested delta: ${quantityDelta}, Available: ${previousQty}`);
      }

      item.quantity = newQuantity;
      const updatedItem = await queryRunner.manager.save(item);

      // Record immutable audit log
      const audit = queryRunner.manager.create(AuditLog, {
        organization_id: organizationId,
        actor_id: actorId,
        action: "STOCK_ADJUSTMENT",
        entity_type: "InventoryItem",
        entity_id: itemId,
        before: { quantity: previousQty, reason },
        after: { quantity: newQuantity, delta: quantityDelta },
      });
      await queryRunner.manager.save(audit);

      await queryRunner.commitTransaction();
      return updatedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getBySku(sku: string, organizationId?: string): Promise<InventoryItem | null> {
    const where: any = { sku };
    if (organizationId) where.organization_id = organizationId;
    return this.repo.findOneBy(where);
  }
}