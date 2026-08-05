import { Vendor } from "../entity/Vendor";
import { AppDataSource } from "../db";

export class VendorService {
  private get repo() {
    return AppDataSource.getRepository(Vendor);
  }

  async list(orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Vendor[]> {
    return this.repo.find({ where: { organization_id: orgId } });
  }

  async create(dto: Partial<Vendor>, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Vendor> {
    const entity = this.repo.create({ ...dto, organization_id: orgId });
    return this.repo.save(entity);
  }

  async update(id: string, changes: Partial<Vendor>, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Vendor> {
    await this.repo.update({ id, organization_id: orgId }, changes);
    const updated = await this.repo.findOneByOrFail({ id, organization_id: orgId });
    return updated;
  }

  async delete(id: string, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<void> {
    await this.repo.delete({ id, organization_id: orgId });
  }

  async findById(id: string, orgId: string = "00000000-0000-0000-0000-000000000000"): Promise<Vendor | null> {
    return this.repo.findOneBy({ id, organization_id: orgId });
  }
}