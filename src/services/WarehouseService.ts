import { Warehouse } from "../entity/Warehouse";
import { AppDataSource } from "../db";

export class WarehouseService {
  private get repo() {
    return AppDataSource.getRepository(Warehouse);
  }

  async list(): Promise<Warehouse[]> {
    return this.repo.find();
  }

  async create(dto: Partial<Warehouse>): Promise<Warehouse> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Warehouse>): Promise<Warehouse> {
    await this.repo.update(id, changes);
    const updated = await this.repo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<Warehouse | null> {
    return this.repo.findOneBy({ id });
  }
}