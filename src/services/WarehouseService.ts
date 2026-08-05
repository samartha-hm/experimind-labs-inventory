import { Warehouse } from "../entity/Warehouse.ts";
import { AppDataSource } from "../db.ts";

export class WarehouseService {
  private get repo() {
    return AppDataSource.getRepository(Warehouse);
  }

  async list(organizationId?: string): Promise<Warehouse[]> {
    const where: any = {};
    if (organizationId) where.organization_id = organizationId;
    return this.repo.find({ where });
  }

  async create(dto: Partial<Warehouse>, organizationId?: string): Promise<Warehouse> {
    const entity = this.repo.create({
      ...dto,
      organization_id: organizationId || dto.organization_id || "00000000-0000-0000-0000-000000000000",
    });
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Warehouse>, organizationId?: string): Promise<Warehouse> {
    const where: any = { id };
    if (organizationId) where.organization_id = organizationId;

    const existing = await this.repo.findOneBy(where);
    if (!existing) {
      throw new Error(`Warehouse '${id}' not found in organization.`);
    }

    Object.assign(existing, changes);
    return this.repo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const where: any = { id };
    if (organizationId) where.organization_id = organizationId;
    await this.repo.delete(where);
  }

  async findById(id: string, organizationId?: string): Promise<Warehouse | null> {
    const where: any = { id };
    if (organizationId) where.organization_id = organizationId;
    return this.repo.findOneBy(where);
  }
}