import { Bin } from "../entity/Bin";
import { AppDataSource } from "../db";

export class BinService {
  private get repo() {
    return AppDataSource.getRepository(Bin);
  }

  async list(warehouseId?: string, organizationId?: string): Promise<Bin[]> {
    const qb = this.repo.createQueryBuilder("bin");
    if (organizationId) {
      qb.andWhere("bin.organization_id = :organizationId", { organizationId });
    }
    if (warehouseId) {
      qb.andWhere("bin.warehouse_id = :warehouseId", { warehouseId });
    }
    return qb.getMany();
  }

  async create(dto: Partial<Bin> & { warehouse_id?: string; warehouse?: { id: string } }, organizationId?: string): Promise<Bin> {
    const orgId = organizationId || (dto as any).organization_id || "00000000-0000-0000-0000-000000000000";
    const warehouseId = dto.warehouse_id || dto.warehouse?.id;
    if (!warehouseId) {
      throw new Error("warehouse_id is required to create a bin");
    }

    const entity = this.repo.create({
      ...dto,
      warehouse_id: warehouseId,
      organization_id: orgId,
    });
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Bin> & { warehouse_id?: string }, organizationId?: string): Promise<Bin> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Bin '${id}' not found or access denied.`);
    }
    Object.assign(existing, changes);
    if (changes.warehouse_id) {
      existing.warehouse_id = changes.warehouse_id;
    }
    return this.repo.save(existing);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    const existing = await this.findById(id, organizationId);
    if (!existing) {
      throw new Error(`Bin '${id}' not found or access denied.`);
    }
    await this.repo.remove(existing);
  }

  async findById(id: string, organizationId?: string): Promise<Bin | null> {
    const where: any = { id };
    if (organizationId) {
      where.organization_id = organizationId;
    }
    return this.repo.findOne({ where, relations: ["warehouse"] });
  }
}