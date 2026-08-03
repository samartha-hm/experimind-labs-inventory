import { InventoryItem } from "../entity/InventoryItem";
import { AppDataSource } from "../db";

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
  }): Promise<InventoryItem[]> {
    const qb = this.repo.createQueryBuilder("item");
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

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async getBySku(sku: string): Promise<InventoryItem | null> {
    return this.repo.findOneBy({ sku });
  }
}