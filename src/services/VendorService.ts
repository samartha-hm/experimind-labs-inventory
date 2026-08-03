import { Vendor } from "../entity/Vendor";
import { AppDataSource } from "../db";

export class VendorService {
  private get repo() {
    return AppDataSource.getRepository(Vendor);
  }

  async list(): Promise<Vendor[]> {
    return this.repo.find();
  }

  async create(dto: Partial<Vendor>): Promise<Vendor> {
    const entity = this.repo.create(dto);
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Vendor>): Promise<Vendor> {
    await this.repo.update(id, changes);
    const updated = await this.repo.findOneByOrFail({ id });
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async findById(id: string): Promise<Vendor | null> {
    return this.repo.findOneBy({ id });
  }
}