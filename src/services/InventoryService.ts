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

  async getById(id: string, organizationId?: string): Promise<InventoryItem | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.repo.findOne({ where });
  }

  async create(dto: Partial<InventoryItem>, organizationId?: string): Promise<InventoryItem> {
    const entity = this.repo.create({
      ...dto,
      organization_id: organizationId || dto.organization_id || "00000000-0000-0000-0000-000000000000",
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    changes: Partial<InventoryItem>,
    organizationId?: string
  ): Promise<InventoryItem> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const item = await this.repo.findOne({ where });
    if (!item) {
      throw new Error(`Inventory item ${id} not found or access denied.`);
    }

    const { quantity, ...allowedChanges } = changes as any;
    Object.assign(item, allowedChanges);
    return this.repo.save(item);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    const item = await this.repo.findOne({ where });
    if (!item) {
      throw new Error(`Inventory item ${id} not found or access denied.`);
    }
    await this.repo.remove(item);
  }

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
      const item = await queryRunner.manager.findOne(InventoryItem, {
        where: { id: itemId },
        lock: { mode: "pessimistic_write" },
      });

      if (!item) {
        throw new Error(`Item ${itemId} not found`);
      }

      if (organizationId && item.organization_id !== organizationId) {
        throw new Error(`Access denied for item ${itemId} under org ${organizationId}`);
      }

      const oldQuantity = item.quantity;
      const newQuantity = oldQuantity + quantityDelta;

      if (newQuantity < 0 && !item.is_common) {
        throw new Error(
          `Insufficient stock for ${item.name}. Available: ${oldQuantity}, requested change: ${quantityDelta}`
        );
      }

      item.quantity = Math.max(0, newQuantity);
      const savedItem = await queryRunner.manager.save(InventoryItem, item);

      const auditLog = queryRunner.manager.create(AuditLog, {
        organization_id: organizationId || "00000000-0000-0000-0000-000000000000",
        actor_id: actorId || "00000000-0000-0000-0000-000000000001",
        action: "UPDATE_STOCK",
        entity_type: "InventoryItem",
        entity_id: itemId,
        before: { quantity: oldQuantity },
        after: { quantity: item.quantity, delta: quantityDelta, reason },
      });
      await queryRunner.manager.save(AuditLog, auditLog);

      await queryRunner.commitTransaction();
      return savedItem;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}