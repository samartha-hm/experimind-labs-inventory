import { Bin } from "../entity/Bin";
import { AppDataSource } from "../db";

export class BinService {
  private get repo() {
    return AppDataSource.getRepository(Bin);
  }

  async list(warehouseId?: string, _organizationId?: string): Promise<Bin[]> {
    const qb = this.repo.createQueryBuilder("bin");
    if (warehouseId) {
      qb.andWhere("bin.warehouse_id = :warehouseId", { warehouseId });
    }
    return qb.getMany();
  }

  async create(dto: Partial<Bin>, _organizationId?: string): Promise<Bin> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Bin>, _organizationId?: string): Promise<Bin> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Bin '${id}' not found.`);
    }
    Object.assign(existing, changes);
    return this.repo.save(existing);
  }

  async delete(id: string, _organizationId?: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) {
      throw new Error(`Bin '${id}' not found.`);
    }
    await this.repo.remove(existing);
  }

  async findById(id: string, _organizationId?: string): Promise<Bin | null> {
    return this.repo.findOneBy({ id });
  }
}