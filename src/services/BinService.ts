import { Bin } from "../entity/Bin";
import { Warehouse } from "../entity/Warehouse";
import { AppDataSource } from "../db";

export class BinService {
  private get repo() {
    return AppDataSource.getRepository(Bin);
  }

  async list(warehouseId?: string): Promise<Bin[]> {
    const qb = this.repo.createQueryBuilder("bin");
    if (warehouseId) {
      qb.where("bin.warehouseId = :warehouseId", { warehouseId });
    }
    return qb.getMany();
  }

  async create(dto: Partial<Bin>): Promise<Bin> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Bin>): Promise<Bin> {
    await this.repo.update(id, changes);
    const updated = await this.repo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<Bin | null> {
    return this.repo.findOneBy({ id });
  }
}